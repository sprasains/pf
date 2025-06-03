import { Worker } from 'bullmq';
import { redis } from '../utils/cache';
import { logger } from '../utils/logger';
import { QueueName, JobType } from './queue';
import { prisma } from '../utils/db';

// Create workers for each queue
const exportsWorker = new Worker(
  QueueName.EXPORTS,
  async job => {
    switch (job.name) {
      case JobType.SCHEDULED_EXPORT:
        const { templateId, userId } = job.data;
        logger.info(`Processing scheduled export for template ${templateId}`);
        
        // Get export template
        const template = await prisma.exportTemplate.findUnique({
          where: { id: templateId },
        });
        
        if (!template) {
          throw new Error(`Export template ${templateId} not found`);
        }
        
        // Create export job
        const exportJob = await prisma.exportJob.create({
          data: {
            templateId,
            userId,
            status: 'PROCESSING',
          },
        });
        
        // Process export
        // ... export processing logic ...
        
        // Update status
        await prisma.exportJob.update({
          where: { id: exportJob.id },
          data: { status: 'COMPLETED' },
        });
        break;
    }
  },
  { connection: redis }
);

const auditsWorker = new Worker(
  QueueName.AUDITS,
  async job => {
    switch (job.name) {
      case JobType.EXECUTION_AUDIT:
        const { executionId } = job.data;
        logger.info(`Processing audit for execution ${executionId}`);
        
        // Get workflow execution
        const execution = await prisma.workflowExecution.findUnique({
          where: { id: executionId },
          include: { workflow: true },
        });
        
        if (!execution) {
          throw new Error(`Workflow execution ${executionId} not found`);
        }
        
        // Create audit log
        await prisma.auditLog.create({
          data: {
            action: 'WORKFLOW_EXECUTION',
            entityId: executionId,
            entityType: 'WORKFLOW',
            metadata: {
              workflowId: execution.workflowId,
              status: execution.status,
              duration: execution.completedAt 
                ? execution.completedAt.getTime() - execution.startedAt.getTime()
                : null,
            },
          },
        });
        break;
    }
  },
  { connection: redis }
);

const notificationsWorker = new Worker(
  QueueName.NOTIFICATIONS,
  async job => {
    switch (job.name) {
      case JobType.EMAIL_ALERT:
        const { to, subject, body } = job.data;
        logger.info(`Sending email to ${to}`);
        // ... email sending logic ...
        break;
        
      case JobType.SLACK_ALERT:
        const { channel, message } = job.data;
        logger.info(`Sending Slack message to ${channel}`);
        // ... Slack message sending logic ...
        break;
    }
  },
  { connection: redis }
);

const workflowExecutionsWorker = new Worker(
  QueueName.WORKFLOW_EXECUTIONS,
  async job => {
    switch (job.name) {
      case JobType.WORKFLOW_EXECUTION:
        const { workflowId, input } = job.data;
        logger.info(`Executing workflow ${workflowId}`);
        
        try {
          // Create execution record
          const execution = await prisma.workflowExecution.create({
            data: {
              workflowId,
              status: 'RUNNING',
              startedAt: new Date(),
              input,
            },
          });
          
          // Execute workflow
          // ... workflow execution logic ...
          
          // Update status
          await prisma.workflowExecution.update({
            where: { id: execution.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        } catch (error) {
          logger.error(`Workflow execution failed:`, error);
          throw error;
        }
        break;
    }
  },
  { connection: redis }
);

// Worker error handling
const workers = [exportsWorker, auditsWorker, notificationsWorker, workflowExecutionsWorker];

workers.forEach(worker => {
  worker.on('error', error => {
    logger.error(`Worker ${worker.name} error:`, error);
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Job ${job?.id} in worker ${worker.name} failed:`, error);
  });
  
  worker.on('completed', job => {
    logger.info(`Job ${job.id} in worker ${worker.name} completed`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down workers...');
  await Promise.all(workers.map(worker => worker.close()));
  logger.info('Workers shut down successfully');
}); 