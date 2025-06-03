import { Queue, Worker, Job } from 'bullmq';
// import { redis } from './redis'; // Removed import from local redis
import { redisClient } from '../utils/redisClient'; // Import shared redis client
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient

const prisma = new PrismaClient(); // Instantiate PrismaClient

// Queue configurations
const queueConfig = {
  connection: redisClient, // Use the shared redisClient
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: true,
    removeOnFail: false
  }
};

// Create queues
export const auditQueue = new Queue('audit', queueConfig);
export const executionQueue = new Queue('execution', queueConfig);

// Job logger middleware
export const jobLogger = async (job: Job, next: () => Promise<any>) => {
  const startTime = Date.now();
  try {
    const result = await next();
    const duration = Date.now() - startTime;

    logger.info('Job completed', {
      jobId: job.id,
      jobName: job.name,
      duration,
      success: true
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('Job failed', {
      jobId: job.id,
      jobName: job.name,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
};

// Audit queue worker
const auditWorker = new Worker(
  'audit',
  async (job: Job) => {
    const { action, userId, orgId, details } = job.data;
    
    // Process audit log - Use camelCase fields from schema.prisma
    await prisma.auditLog.create({
      data: {
        action: action, 
        userId: userId, 
        orgId: orgId, 
        metadata: details, 
        resource: 'QueueJob', // Assuming resource field exists
        // resourceId is optional
        ipAddress: undefined, // Assuming ipAddress might come from job data or be optional
        userAgent: undefined, // Assuming userAgent might come from job data or be optional
        createdAt: new Date() 
      }
    });
  },
  { connection: redisClient } // Use the shared redisClient
);

// Execution queue worker
const executionWorker = new Worker(
  'execution',
  async (job: Job) => {
    const { workflowId, userId, orgId, input } = job.data;
    
    // Process workflow execution
    const execution = await prisma.executionLog.create({
      data: {
        workflowId,
        userId,
        orgId,
        status: 'RUNNING',
        createdAt: new Date()
      }
    });

    try {
      // Execute workflow logic here
      // ...

      await prisma.executionLog.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          updatedAt: new Date(),
          metadata: {
            duration: Date.now() - execution.createdAt.getTime(),
          },
        }
      });
    } catch (error) {
      await prisma.executionLog.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          updatedAt: new Date(),
          metadata: {
            duration: Date.now() - execution.createdAt.getTime(),
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      });
      throw error;
    }
  },
  { connection: redisClient } // Use the shared redisClient
);

// Queue event handlers
auditQueue.on('completed' as any, (job: Job) => {
  logger.info('Audit job completed', { jobId: job.id });
});

auditQueue.on('failed' as any, (job: Job, error: Error) => {
  logger.error('Audit job failed', { jobId: job?.id, error });
});

executionQueue.on('completed' as any, (job: Job) => {
  logger.info('Execution job completed', { jobId: job.id });
});

executionQueue.on('failed' as any, (job: Job, error: Error) => {
  logger.error('Execution job failed', { jobId: job?.id, error });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down queues...');
  await Promise.all([
    auditQueue.close(),
    executionQueue.close(),
    auditWorker.close(),
    executionWorker.close()
  ]);
  process.exit(0);
}); 