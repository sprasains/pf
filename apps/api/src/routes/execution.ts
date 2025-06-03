import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import * as executionService from '../services/execution';

const router = Router();

/**
 * @swagger
 * /api/executions:
 *   post:
 *     summary: Start a new workflow execution
 *     tags: [Executions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *             properties:
 *               workflowId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Execution started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 executionId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authenticate,
  validateRequest({
    body: z.object({
      workflowId: z.string().uuid()
    })
  }),
  async (req, res, next) => {
    try {
      const { workflowId } = req.body;
      const executionId = await executionService.startExecution(
        workflowId,
        req.user.id,
        req.user.orgId
      );
      res.json({ executionId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/executions/{id}/complete:
 *   post:
 *     summary: Complete a workflow execution
 *     tags: [Executions]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [SUCCESS, ERROR]
 *               error:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution completed successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Execution not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/complete',
  authenticate,
  validateRequest({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      status: z.enum(['SUCCESS', 'ERROR']),
      error: z.string().optional()
    })
  }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, error } = req.body;
      await executionService.completeExecution(id, status, error);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/executions/{id}/transition:
 *   post:
 *     summary: Record a state transition
 *     tags: [Executions]
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
 *               - toStateId
 *             properties:
 *               toStateId:
 *                 type: string
 *                 format: uuid
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Transition recorded successfully
 *       400:
 *         description: Invalid request or transition
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Execution not found
 *       500:
 *         description: Server error
 */
router.post(
  '/:id/transition',
  authenticate,
  validateRequest({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      toStateId: z.string().uuid(),
      metadata: z.record(z.any()).optional()
    })
  }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { toStateId, metadata } = req.body;
      const transitionId = await executionService.recordStateTransition(id, toStateId, metadata);
      res.json({ transitionId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/executions/{id}/states:
 *   get:
 *     summary: Get execution states
 *     tags: [Executions]
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
 *         description: List of execution states
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   state:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Execution not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id/states',
  authenticate,
  validateRequest({
    params: z.object({
      id: z.string().uuid()
    })
  }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const states = await executionService.getExecutionStates(id);
      res.json(states);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/executions/{id}:
 *   get:
 *     summary: Get execution details
 *     tags: [Executions]
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
 *         description: Execution details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 workflow:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, RUNNING, SUCCESS, ERROR]
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 endedAt:
 *                   type: string
 *                   format: date-time
 *                 duration:
 *                   type: number
 *                 states:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Execution not found
 *       500:
 *         description: Server error
 */
router.get(
  '/:id',
  authenticate,
  validateRequest({
    params: z.object({
      id: z.string().uuid()
    })
  }),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const execution = await executionService.getExecutionById(id);
      res.json(execution);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 