import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';
import {
  CreateWorkflowTemplate,
  CreateWorkflowInstance,
  UpdateWorkflowTemplate,
  UpdateWorkflowInstance,
  WorkflowTemplate,
  WorkflowInstance
} from '@pumpflix/shared';

export class WorkflowService {
  constructor(private prisma: PrismaClient) {}

  async createTemplate(data: CreateWorkflowTemplate): Promise<WorkflowTemplate> {
    try {
      const template = await this.prisma.workflowTemplate.create({
        data: {
          name: data.name,
          description: data.description,
          config: data.config,
          sourceType: data.sourceType,
          metadata: data.metadata
        }
      });

      logger.info('Created workflow template', {
        templateId: template.id,
        sourceType: template.sourceType
      });

      return template;
    } catch (error) {
      logger.error('Failed to create workflow template', { error });
      throw new AppError('Failed to create workflow template');
    }
  }

  async createInstance(data: CreateWorkflowInstance): Promise<WorkflowInstance> {
    try {
      // Verify template exists
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id: data.templateId }
      });

      if (!template) {
        throw new AppError('Template not found');
      }

      const instance = await this.prisma.workflowInstance.create({
        data: {
          name: data.name,
          description: data.description,
          config: data.config,
          promptText: data.promptText,
          templateId: data.templateId,
          tenantId: data.tenantId
        }
      });

      logger.info('Created workflow instance', {
        instanceId: instance.id,
        templateId: instance.templateId,
        sourceType: template.sourceType
      });

      return instance;
    } catch (error) {
      logger.error('Failed to create workflow instance', { error });
      throw new AppError('Failed to create workflow instance');
    }
  }

  async updateTemplate(id: string, data: UpdateWorkflowTemplate): Promise<WorkflowTemplate> {
    try {
      const template = await this.prisma.workflowTemplate.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          config: data.config,
          metadata: data.metadata
        }
      });

      logger.info('Updated workflow template', {
        templateId: template.id,
        sourceType: template.sourceType
      });

      return template;
    } catch (error) {
      logger.error('Failed to update workflow template', { error });
      throw new AppError('Failed to update workflow template');
    }
  }

  async updateInstance(id: string, data: UpdateWorkflowInstance): Promise<WorkflowInstance> {
    try {
      const instance = await this.prisma.workflowInstance.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          config: data.config,
          isActive: data.isActive,
          promptText: data.promptText
        }
      });

      logger.info('Updated workflow instance', {
        instanceId: instance.id,
        templateId: instance.templateId
      });

      return instance;
    } catch (error) {
      logger.error('Failed to update workflow instance', { error });
      throw new AppError('Failed to update workflow instance');
    }
  }

  async getTemplate(id: string): Promise<WorkflowTemplate> {
    try {
      const template = await this.prisma.workflowTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        throw new AppError('Template not found');
      }

      return template;
    } catch (error) {
      logger.error('Failed to get workflow template', { error });
      throw new AppError('Failed to get workflow template');
    }
  }

  async getInstance(id: string): Promise<WorkflowInstance> {
    try {
      const instance = await this.prisma.workflowInstance.findUnique({
        where: { id },
        include: {
          template: true
        }
      });

      if (!instance) {
        throw new AppError('Instance not found');
      }

      return instance;
    } catch (error) {
      logger.error('Failed to get workflow instance', { error });
      throw new AppError('Failed to get workflow instance');
    }
  }

  async listTemplates(sourceType?: 'prebuilt' | 'ai'): Promise<WorkflowTemplate[]> {
    try {
      const templates = await this.prisma.workflowTemplate.findMany({
        where: sourceType ? { sourceType } : undefined
      });

      return templates;
    } catch (error) {
      logger.error('Failed to list workflow templates', { error });
      throw new AppError('Failed to list workflow templates');
    }
  }

  async listInstances(tenantId: string): Promise<WorkflowInstance[]> {
    try {
      const instances = await this.prisma.workflowInstance.findMany({
        where: { tenantId },
        include: {
          template: true
        }
      });

      return instances;
    } catch (error) {
      logger.error('Failed to list workflow instances', { error });
      throw new AppError('Failed to list workflow instances');
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.prisma.workflowTemplate.delete({
        where: { id }
      });

      logger.info('Deleted workflow template', { templateId: id });
    } catch (error) {
      logger.error('Failed to delete workflow template', { error });
      throw new AppError('Failed to delete workflow template');
    }
  }

  async deleteInstance(id: string): Promise<void> {
    try {
      await this.prisma.workflowInstance.delete({
        where: { id }
      });

      logger.info('Deleted workflow instance', { instanceId: id });
    } catch (error) {
      logger.error('Failed to delete workflow instance', { error });
      throw new AppError('Failed to delete workflow instance');
    }
  }
} 