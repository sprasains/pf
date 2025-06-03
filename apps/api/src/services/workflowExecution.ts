import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';
import { n8nClient } from '../utils/n8n';
import { WorkflowInstance } from '@pumpflix/shared';

export class WorkflowExecutionService {
  constructor(private prisma: PrismaClient) {}

  async startWorkflow(instanceId: string): Promise<void> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          template: true
        }
      });

      if (!instance) {
        throw new AppError('Workflow instance not found');
      }

      if (instance.isActive) {
        throw new AppError('Workflow is already running');
      }

      // Start the workflow in n8n
      const response = await n8nClient.post('/workflows/start', {
        workflowId: instanceId,
        config: instance.config
      });

      // Update instance status
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { isActive: true }
      });

      logger.info('Started workflow', {
        instanceId,
        templateId: instance.templateId,
        sourceType: instance.template.sourceType
      });
    } catch (error) {
      logger.error('Failed to start workflow', { error });
      throw new AppError('Failed to start workflow');
    }
  }

  async stopWorkflow(instanceId: string): Promise<void> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new AppError('Workflow instance not found');
      }

      if (!instance.isActive) {
        throw new AppError('Workflow is not running');
      }

      // Stop the workflow in n8n
      await n8nClient.post('/workflows/stop', {
        workflowId: instanceId
      });

      // Update instance status
      await this.prisma.workflowInstance.update({
        where: { id: instanceId },
        data: { isActive: false }
      });

      logger.info('Stopped workflow', { instanceId });
    } catch (error) {
      logger.error('Failed to stop workflow', { error });
      throw new AppError('Failed to stop workflow');
    }
  }

  async getWorkflowStatus(instanceId: string): Promise<{
    isActive: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
  }> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new AppError('Workflow instance not found');
      }

      // Get workflow status from n8n
      const response = await n8nClient.get(`/workflows/${instanceId}/status`);

      return {
        isActive: instance.isActive,
        lastRun: response.data.lastRun,
        nextRun: response.data.nextRun
      };
    } catch (error) {
      logger.error('Failed to get workflow status', { error });
      throw new AppError('Failed to get workflow status');
    }
  }

  async getWorkflowLogs(instanceId: string): Promise<{
    logs: Array<{
      timestamp: Date;
      level: string;
      message: string;
    }>;
  }> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id: instanceId }
      });

      if (!instance) {
        throw new AppError('Workflow instance not found');
      }

      // Get workflow logs from n8n
      const response = await n8nClient.get(`/workflows/${instanceId}/logs`);

      return {
        logs: response.data.logs
      };
    } catch (error) {
      logger.error('Failed to get workflow logs', { error });
      throw new AppError('Failed to get workflow logs');
    }
  }
} 