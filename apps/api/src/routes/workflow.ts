/// <reference path="../types/custom.d.ts" />
import { Router } from 'express';
import { isAuthenticated } from '../middleware/authMiddleware';
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
    const workflow = await WorkflowService.archiveWorkflow(
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
 * /api/workflows/{id}/unarchive:
 *   post:
 *     tags: [Workflows]
 *     summary: Unarchive a workflow
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
 *         description: Workflow unarchived successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.post('/:id/unarchive', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const workflow = await WorkflowService.unarchiveWorkflow(
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
 * /api/workflows/{id}:
 *   get:
 *     tags: [Workflows]
 *     summary: Get a workflow by ID
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
 *         description: Workflow details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.get('/:id', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const workflow = await WorkflowService.getWorkflowById(
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
 * /api/workflows:
 *   get:
 *     tags: [Workflows]
 *     summary: Get all workflows for the authenticated user's organization
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workflows
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const workflows = await WorkflowService.getAllWorkflows(req.user!.orgId);

    res.json({
      workflows: workflows.map((workflow) => ({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        jsonSchema: workflow.currentVersion?.jsonSchema,
        createdAt: workflow.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/versions:
 *   get:
 *     tags: [Workflows]
 *     summary: Get all versions of a workflow by ID
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
 *         description: List of workflow versions
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow not found
 *       500:
 *         description: Server error
 */
router.get('/:id/versions', isAuthenticated, apiRateLimiter, async (req, res, next) => {
  try {
    const versions = await WorkflowService.getWorkflowVersions(
      req.params.id,
      req.user!.id
    );

    res.json({
      versions: versions.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        jsonSchema: version.jsonSchema,
        createdAt: version.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/workflows/{id}/versions/{versionId}:
 *   get:
 *     tags: [Workflows]
 *     summary: Get a specific version of a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow version details
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow or version not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id/versions/:versionId',
  isAuthenticated,
  apiRateLimiter,
  async (req, res, next) => {
    try {
      const version = await WorkflowService.getSpecificWorkflowVersion(
        req.params.id,
        req.params.versionId,
        req.user!.id
      );

      res.json({
        version: {
          id: version.id,
          versionNumber: version.versionNumber,
          jsonSchema: version.jsonSchema,
          createdAt: version.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/workflows/{id}/versions/{versionId}/activate:
 *   post:
 *     tags: [Workflows]
 *     summary: Activate a specific version of a workflow
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Workflow version activated successfully
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Workflow or version not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/versions/:versionId/activate',
  isAuthenticated,
  apiRateLimiter,
  async (req, res, next) => {
    try {
      const workflow = await WorkflowService.activateWorkflowVersion(
        req.params.id,
        req.params.versionId,
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
  }
);

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