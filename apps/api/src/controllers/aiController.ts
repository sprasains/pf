import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';
import { buildWorkflowFromPrompt } from '../services/aiWorkflowService';

const prisma = new PrismaClient();

// Validation schemas
const generateWorkflowSchema = z.object({
  prompt: z.string().min(10).max(1000),
});

const saveTemplateSchema = z.object({
  title: z.string().min(3).max(100),
  promptBody: z.string().min(10).max(1000),
});

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    orgId: string;
    roleId?: string;
  };
}

export const generateWorkflow = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('Not authenticated', 401);
    }

    const { prompt } = generateWorkflowSchema.parse(req.body);

    // Call AI service to generate workflow
    const workflowJson = await buildWorkflowFromPrompt(prompt);

    // Log the generation
    await prisma.auditLogs.create({
      data: {
        actionType: 'WORKFLOW_GENERATE',
        actorId: req.user.id,
        description: `Generated workflow from prompt: ${prompt.substring(0, 100)}...`,
      },
    });

    logger.info('Workflow generated successfully', {
      userId: req.user.id,
      promptLength: prompt.length,
    });

    res.json({ workflowJson });
  } catch (error) {
    next(error);
  }
};

export const saveTemplate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('Not authenticated', 401);
    }

    const { title, promptBody } = saveTemplateSchema.parse(req.body);

    const template = await prisma.aiPromptTemplates.create({
      data: {
        userId: req.user.id,
        title,
        promptBody,
      },
    });

    logger.info('AI prompt template saved', {
      userId: req.user.id,
      templateId: template.id,
    });

    res.json({
      template: {
        id: template.id,
        title: template.title,
        promptBody: template.promptBody,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTemplates = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.id) {
      throw new AppError('Not authenticated', 401);
    }

    const templates = await prisma.aiPromptTemplates.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      templates: templates.map(template => ({
        id: template.id,
        title: template.title,
        promptBody: template.promptBody,
        createdAt: template.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}; 