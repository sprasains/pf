import { Router } from 'express';
import { z } from 'zod';
import { AIService } from '../services/ai';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { createRateLimiter } from '../middleware/rateLimiter';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import { metrics } from '../utils/metrics';
import { rateLimiter } from '../middleware/rateLimiter';
import { isAuthenticated } from '../middleware/auth';
import { generateWorkflow, saveTemplate, getTemplates } from '../controllers/aiController';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

// Rate limiter for AI generation (5 requests per minute)
const aiRateLimiter = createRateLimiter({
  points: 5,
  duration: 60,
  blockDuration: 60
});

// Validation schemas
const generateWorkflowSchema = z.object({
  prompt: z.string().min(10).max(1000)
});

const promptTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  template: z.string(),
  variables: z.array(z.string()),
  category: z.string(),
  metadata: z.record(z.any()).optional()
});

// Routes
router.post(
  '/ai/generate',
  authenticate,
  aiRateLimiter,
  validateRequest({ body: generateWorkflowSchema }),
  async (req, res) => {
    try {
      const { workflow, promptId } = await AIService.generateWorkflow(
        req.body.prompt,
        req.user!.id,
        req.user!.orgId
      );

      res.json({ workflow, promptId });
    } catch (error) {
      logger.error('Failed to generate workflow', { error });
      res.status(500).json({
        error: 'Failed to generate workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.post(
  '/ai/generate-and-save',
  authenticate,
  aiRateLimiter,
  validateRequest({ body: generateWorkflowSchema }),
  async (req, res) => {
    try {
      const workflow = await AIService.generateAndSaveWorkflow(
        req.body.prompt,
        req.user!.id,
        req.user!.orgId
      );

      res.status(201).json(workflow);
    } catch (error) {
      logger.error('Failed to generate and save workflow', { error });
      res.status(500).json({
        error: 'Failed to generate and save workflow',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get(
  '/ai/prompts',
  authenticate,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await AIService.listPrompts(
        req.user!.id,
        req.user!.orgId,
        page,
        limit
      );

      res.json(result);
    } catch (error) {
      logger.error('Failed to list prompts', { error });
      res.status(500).json({
        error: 'Failed to list prompts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get(
  '/ai/prompts/:id',
  authenticate,
  async (req, res) => {
    try {
      const prompt = await AIService.getPrompt(
        req.params.id,
        req.user!.id,
        req.user!.orgId
      );

      res.json(prompt);
    } catch (error) {
      if (error instanceof Error && error.message === 'Prompt not found') {
        return res.status(404).json({
          error: 'Prompt not found'
        });
      }

      logger.error('Failed to get prompt', { error });
      res.status(500).json({
        error: 'Failed to get prompt',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai/workflow/generate:
 *   post:
 *     tags: [AI]
 *     summary: Generate a workflow from a prompt
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: Description of the workflow to generate
 *     responses:
 *       200:
 *         description: Workflow generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workflowJson:
 *                   type: object
 *                   properties:
 *                     nodes:
 *                       type: array
 *                       items:
 *                         type: object
 *                     edges:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  '/workflow/generate',
  isAuthenticated,
  apiRateLimiter,
  generateWorkflow
);

/**
 * @swagger
 * /api/ai/templates:
 *   post:
 *     tags: [AI]
 *     summary: Save a new AI prompt template
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - promptBody
 *             properties:
 *               title:
 *                 type: string
 *               promptBody:
 *                 type: string
 *     responses:
 *       200:
 *         description: Template saved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post(
  '/templates',
  isAuthenticated,
  apiRateLimiter,
  saveTemplate
);

/**
 * @swagger
 * /api/ai/templates:
 *   get:
 *     tags: [AI]
 *     summary: Get all AI prompt templates for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       promptBody:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get(
  '/templates',
  isAuthenticated,
  getTemplates
);

export default router; 