import { Queue, Worker, Job } from 'bullmq';
// import { redis } from './cache'; // Removed import from cache utility
import { redisClient } from './redisClient'; // Import shared redis client
import { logger } from './logger';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Queue names
export enum QueueName {
  EXPORTS = 'exports',
  AUDITS = 'audits',
  NOTIFICATIONS = 'notifications',
  WORKFLOW_EXECUTIONS = 'workflow-executions',
}

// Job types
export enum JobType {
  SCHEDULED_EXPORT = 'scheduled-export',
  EXECUTION_AUDIT = 'execution-audit',
  EMAIL_ALERT = 'email-alert',
  SLACK_ALERT = 'slack-alert',
  WORKFLOW_EXECUTION = 'workflow-execution',
}

// Queue configuration
const queueConfig = {
  connection: redisClient, // Use the shared redisClient
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

// Create queues
export const queues = {
  [QueueName.EXPORTS]: new Queue(QueueName.EXPORTS, queueConfig),
  [QueueName.AUDITS]: new Queue(QueueName.AUDITS, queueConfig),
  [QueueName.NOTIFICATIONS]: new Queue(QueueName.NOTIFICATIONS, queueConfig),
  [QueueName.WORKFLOW_EXECUTIONS]: new Queue(QueueName.WORKFLOW_EXECUTIONS, queueConfig),
};

// Job processor for exports
const exportsWorker = new Worker(
  QueueName.EXPORTS,
  async (job: Job) => {
    const { type, data } = job.data;
    logger.info('Processing export job:', { jobId: job.id, type });

    switch (type) {
      case JobType.SCHEDULED_EXPORT:
        // Handle scheduled export
        const { templateId, userId, orgId } = data;
        const template = await prisma.exportTemplate.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          throw new Error('Export template not found');
        }

        // Create export job
        const exportJob = await prisma.exportJob.create({
          data: {
            userId,
            type: template.type,
            status: 'PROCESSING',
            format: template.format,
            templateId,
          },
        });

        // Process export
        // ... export processing logic ...

        // Update job status
        await prisma.exportJob.update({
          where: { id: exportJob.id },
          data: { status: 'COMPLETED' },
        });
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection: redisClient } // Use the shared redisClient
);

// Job processor for audits
const auditsWorker = new Worker(
  QueueName.AUDITS,
  async (job: Job) => {
    const { type, data } = job.data;
    logger.info('Processing audit job:', { jobId: job.id, type });

    switch (type) {
      case JobType.EXECUTION_AUDIT:
        // Handle execution audit
        const { executionId, userId, orgId } = data;
        const execution = await prisma.workflowExecution.findUnique({
          where: { id: executionId },
          include: { workflow: true },
        });

        if (!execution) {
          throw new Error('Workflow execution not found');
        }

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId,
            orgId,
            action: 'EXECUTION_AUDIT',
            resource: 'WORKFLOW',
            metadata: {
              executionId,
              workflowId: execution.workflowId,
              status: execution.status,
              duration: execution.duration,
            },
          },
        });
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection: redisClient } // Use the shared redisClient
);

// Job processor for notifications
const notificationsWorker = new Worker(
  QueueName.NOTIFICATIONS,
  async (job: Job) => {
    const { type, data } = job.data;
    logger.info('Processing notification job:', { jobId: job.id, type });

    switch (type) {
      case JobType.EMAIL_ALERT:
        // Handle email alert
        const { to, subject, body } = data;
        // ... email sending logic ...
        break;

      case JobType.SLACK_ALERT:
        // Handle Slack alert
        const { channel, message } = data;
        // ... Slack notification logic ...
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection: redisClient } // Use the shared redisClient
);

// Job processor for workflow executions
const workflowExecutionsWorker = new Worker(
  QueueName.WORKFLOW_EXECUTIONS,
  async (job: Job) => {
    const { type, data } = job.data;
    logger.info('Processing workflow execution job:', { jobId: job.id, type });

    switch (type) {
      case JobType.WORKFLOW_EXECUTION:
        // Handle workflow execution
        const { workflowId, userId, orgId } = data;
        const workflow = await prisma.workflowDefinition.findUnique({
          where: { id: workflowId },
        });

        if (!workflow) {
          throw new Error('Workflow not found');
        }

        // Create execution
        const execution = await prisma.workflowExecution.create({
          data: {
            workflowId,
            userId,
            orgId,
            status: 'RUNNING',
          },
        });

        try {
          // Execute workflow
          // ... workflow execution logic ...

          // Update execution status
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'SUCCESS',
              endedAt: new Date(),
              duration: Date.now() - execution.startedAt.getTime(),
            },
          });
        } catch (error) {
          // Update execution status on error
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'ERROR',
              endedAt: new Date(),
              duration: Date.now() - execution.startedAt.getTime(),
              error: error.message,
            },
          });
          throw error;
        }
        break;

      default:
        throw new Error(`Unknown job type: ${type}`);
    }
  },
  { connection: redisClient } // Use the shared redisClient
);

// Error handling
[exportsWorker, auditsWorker, notificationsWorker, workflowExecutionsWorker].forEach(
  (worker) => {
    worker.on('error', (error) => {
      logger.error('Worker error:', error);
    });

    worker.on('failed', (job, error) => {
      logger.error('Job failed:', { jobId: job.id, error });
    });

    worker.on('completed', (job) => {
      logger.info('Job completed:', { jobId: job.id });
    });
  }
);

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    exportsWorker.close(),
    auditsWorker.close(),
    notificationsWorker.close(),
    workflowExecutionsWorker.close(),
  ]);
  process.exit(0);
}); 