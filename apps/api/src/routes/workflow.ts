import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';
import { WorkflowService } from '../services/workflowService';

const router = Router();

// Validation schemas
const createWorkflowSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  jsonSchema: z.record(z.any()),
});

const executeWorkflowSchema = z.object({
  inputData: z.record(z.any()),
});

/**
 * @swagger
 * /api/workflows:
 *   post:
 *     tags: [Workflows]
 *     summary: Create a new workflow
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - jsonSchema
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               jsonSchema:
 *                 type: object
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const input = createWorkflowSchema.parse(req.body);
    const workflow = await WorkflowService.createWorkflow(
      req.user!.orgId,
      req.user!.id,
      input
    );

    res.status(201).json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        jsonSchema: workflow.currentVersion?.jsonSchema,
        createdAt: workflow.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/execute:
 *   post:
 *     tags: [Workflows]
 *     summary: Execute a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inputData
 *             properties:
 *               inputData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Workflow executed successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.post('/:id/execute', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const input = executeWorkflowSchema.parse(req.body);
    const execution = await WorkflowService.executeWorkflow(
      req.params.id,
      req.user!.id,
      input
    );

    res.json({
      execution: {
        id: execution.id,
        status: execution.status,
        startedAt: execution.startedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/clone:
 *   post:
 *     tags: [Workflows]
 *     summary: Clone a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow cloned successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.post('/:id/clone', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const workflow = await WorkflowService.cloneWorkflow(
      req.params.id,
      req.user!.id
    );

    res.json({
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        jsonSchema: workflow.currentVersion?.jsonSchema,
        createdAt: workflow.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/archive:
 *   post:
 *     tags: [Workflows]
 *     summary: Archive a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow archived successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.post('/:id/archive', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    await WorkflowService.archiveWorkflow(req.params.id, req.user!.id);
    res.json({ message: 'Workflow archived successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/template:
 *   post:
 *     tags: [Workflows]
 *     summary: Create a template from a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Template created successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.post('/:id/template', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const template = await WorkflowService.createTemplateFromWorkflow(
      req.params.id,
      req.user!.id
    );

    res.json({
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/metrics:
 *   get:
 *     tags: [Workflows]
 *     summary: Get workflow metrics for the current user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workflow metrics retrieved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/metrics', isAuthenticated, async (req, res, next) => {
  try {
    const metrics = await WorkflowService.getWorkflowMetrics(req.user!.id);
    res.json({ metrics });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/credentials:
 *   get:
 *     tags: [Workflows]
 *     summary: Get credentials available for workflows
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Credentials retrieved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/credentials', isAuthenticated, async (req, res, next) => {
  try {
    const credentials = await WorkflowService.getCredentialsForWorkflow(req.user!.id);
    res.json({ credentials });
  } catch (error) {
    next(error);
  }
});

export default router; 