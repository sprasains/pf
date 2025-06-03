import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

const prisma = new PrismaClient();

interface WorkflowInput {
  name: string;
  description?: string;
  jsonSchema: Record<string, any>;
}

interface WorkflowExecutionInput {
  inputData: Record<string, any>;
}

export class WorkflowService {
  static async createWorkflow(orgId: string, userId: string, input: WorkflowInput) {
    try {
      // Create workflow using stored procedure
      const result = await prisma.$executeRaw`
        CALL create_workflow(
          ${orgId}::uuid,
          ${userId}::uuid,
          ${input.name}::text,
          ${input.description || ''}::text,
          ${input.jsonSchema}::jsonb,
          NULL::uuid
        );
      `;

      // Get the created workflow
      const workflow = await prisma.workflows.findFirst({
        where: {
          organizationId: orgId,
          name: input.name,
        },
        include: {
          currentVersion: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!workflow) {
        throw new AppError('Failed to create workflow', 500);
      }

      logger.info('Workflow created', {
        userId,
        workflowId: workflow.id,
      });

      return workflow;
    } catch (error) {
      logger.error('Error creating workflow', { error });
      throw error;
    }
  }

  static async executeWorkflow(workflowId: string, userId: string, input: WorkflowExecutionInput) {
    try {
      // Get workflow
      const workflow = await prisma.workflows.findFirst({
        where: {
          id: workflowId,
        },
        include: {
          currentVersion: true,
        },
      });

      if (!workflow) {
        throw new AppError('Workflow not found', 404);
      }

      // Execute workflow using stored procedure
      const result = await prisma.$executeRaw`
        CALL log_workflow_execution(
          ${workflowId}::uuid,
          'RUNNING'::text,
          ${input.inputData}::jsonb,
          NULL::jsonb,
          NULL::uuid
        );
      `;

      // Get the execution
      const execution = await prisma.workflowExecutions.findFirst({
        where: {
          workflowId,
        },
        orderBy: {
          startedAt: 'desc',
        },
      });

      if (!execution) {
        throw new AppError('Failed to execute workflow', 500);
      }

      logger.info('Workflow execution started', {
        userId,
        workflowId,
        executionId: execution.id,
      });

      return execution;
    } catch (error) {
      logger.error('Error executing workflow', { error });
      throw error;
    }
  }

  static async cloneWorkflow(workflowId: string, userId: string) {
    try {
      // Clone workflow using stored procedure
      const result = await prisma.$executeRaw`
        CALL clone_workflow(
          ${workflowId}::uuid,
          ${userId}::uuid,
          NULL::uuid
        );
      `;

      // Get the cloned workflow
      const clonedWorkflow = await prisma.workflows.findFirst({
        where: {
          name: {
            contains: ' (Clone)',
          },
        },
        include: {
          currentVersion: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!clonedWorkflow) {
        throw new AppError('Failed to clone workflow', 500);
      }

      logger.info('Workflow cloned', {
        userId,
        originalWorkflowId: workflowId,
        clonedWorkflowId: clonedWorkflow.id,
      });

      return clonedWorkflow;
    } catch (error) {
      logger.error('Error cloning workflow', { error });
      throw error;
    }
  }

  static async archiveWorkflow(workflowId: string, userId: string) {
    try {
      // Archive workflow using stored procedure
      await prisma.$executeRaw`
        CALL archive_workflow(${workflowId}::uuid);
      `;

      logger.info('Workflow archived', {
        userId,
        workflowId,
      });

      return true;
    } catch (error) {
      logger.error('Error archiving workflow', { error });
      throw error;
    }
  }

  static async createTemplateFromWorkflow(workflowId: string, userId: string) {
    try {
      // Create template using stored procedure
      const result = await prisma.$executeRaw`
        CALL create_template_from_workflow(
          ${workflowId}::uuid,
          ${userId}::uuid,
          NULL::uuid
        );
      `;

      // Get the created template
      const template = await prisma.templates.findFirst({
        where: {
          workflowId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!template) {
        throw new AppError('Failed to create template', 500);
      }

      logger.info('Template created from workflow', {
        userId,
        workflowId,
        templateId: template.id,
      });

      return template;
    } catch (error) {
      logger.error('Error creating template', { error });
      throw error;
    }
  }

  static async getWorkflowMetrics(userId: string) {
    try {
      const metrics = await prisma.$queryRaw`
        SELECT * FROM get_user_usage_metrics(${userId}::uuid);
      `;

      return metrics;
    } catch (error) {
      logger.error('Error getting workflow metrics', { error });
      throw error;
    }
  }

  static async getCredentialsForWorkflow(userId: string) {
    try {
      const credentials = await prisma.$queryRaw`
        SELECT * FROM get_credentials_for_workflow(${userId}::uuid);
      `;

      return credentials;
    } catch (error) {
      logger.error('Error getting credentials', { error });
      throw error;
    }
  }
} 