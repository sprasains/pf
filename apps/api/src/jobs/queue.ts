import { Queue } from 'bullmq';
// import { redis } from '../utils/cache'; // Removed import from cache utility
import { redisClient } from '../utils/redisClient'; // Import shared redis client
import { logger } from '../utils/logger';

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
  connection: redisClient, // Use the shared redisClient for connection
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
export const exportsQueue = new Queue(QueueName.EXPORTS, queueConfig);
export const auditsQueue = new Queue(QueueName.AUDITS, queueConfig);
export const notificationsQueue = new Queue(QueueName.NOTIFICATIONS, queueConfig);
export const workflowExecutionsQueue = new Queue(QueueName.WORKFLOW_EXECUTIONS, queueConfig);

// Queue event handlers
const queues = [exportsQueue, auditsQueue, notificationsQueue, workflowExecutionsQueue];

queues.forEach(queue => {
  queue.on('error', error => {
    logger.error(`Queue ${queue.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in queue ${queue.name} failed:`, error);
  });

  queue.on('completed', job => {
    logger.info(`Job ${job.id} in queue ${queue.name} completed`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down queues...');
  await Promise.all(queues.map(queue => queue.close()));
  logger.info('Queues shut down successfully');
}); 