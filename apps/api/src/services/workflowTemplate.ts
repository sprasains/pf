import { prisma } from '../lib/prisma';
import { CacheService } from './cache';
import { logger } from '../utils/logger';
import { WorkflowTemplate, Prisma } from '@prisma/client';
import { extractCredentials, extractVariables } from '../utils/workflow';

export class WorkflowTemplateService {
  private cache: CacheService;

  constructor() {
    this.cache = CacheService.getInstance();
  }

  async getTemplates(type: 'prebuilt' | 'user' = 'prebuilt'): Promise<WorkflowTemplate[]> {
    try {
      // Try to get from cache first
      const cachedTemplates = await this.cache.getCachedTemplates(type);
      if (cachedTemplates.length > 0) {
        return cachedTemplates;
      }

      // If not in cache, get from database
      const templates = await prisma.workflowTemplate.findMany({
        where: { sourceType: type },
        orderBy: { createdAt: 'desc' },
      });

      // Cache the results
      await this.cache.cacheTemplates(templates, type);

      return templates;
    } catch (error) {
      logger.error('Error fetching templates:', error);
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<WorkflowTemplate | null> {
    try {
      // Try cache first
      const cached = await this.cache.getCachedTemplate(id);
      if (cached) return cached;

      // If not in cache, get from database
      const template = await prisma.workflowTemplate.findUnique({
        where: { id },
      });

      if (template) {
        // Cache the template
        await this.cache.cacheTemplate(template, template.sourceType);
      }

      return template;
    } catch (error) {
      logger.error('Error fetching template:', error);
      throw error;
    }
  }

  async createTemplate(data: Prisma.WorkflowTemplateCreateInput): Promise<WorkflowTemplate> {
    try {
      const template = await prisma.workflowTemplate.create({
        data,
      });

      // Cache the new template
      await this.cache.cacheTemplate(template, template.sourceType);

      return template;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  async updateTemplate(id: string, data: Prisma.WorkflowTemplateUpdateInput): Promise<WorkflowTemplate> {
    try {
      const template = await prisma.workflowTemplate.update({
        where: { id },
        data,
      });

      // Invalidate and recache
      await this.cache.invalidateTemplate(id);
      await this.cache.cacheTemplate(template, template.sourceType);

      return template;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      await prisma.workflowTemplate.delete({
        where: { id },
      });

      // Invalidate cache
      await this.cache.invalidateTemplate(id);
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  async promoteInstanceToTemplate(
    instanceId: string,
    data: {
      name: string;
      description: string;
      thumbnail?: string;
    }
  ): Promise<WorkflowTemplate> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: { template: true },
      });

      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      const n8nJson = instance.finalJson || instance.template.n8nJson;
      const requiredCredentials = extractCredentials(n8nJson);
      const inputVariables = extractVariables(n8nJson);

      const template = await this.createTemplate({
        sourceType: 'user',
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
        n8nJson,
        requiredCredentials,
        inputVariables,
      });

      return template;
    } catch (error) {
      logger.error('Error promoting instance to template:', error);
      throw error;
    }
  }
} 