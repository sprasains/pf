import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import * as executionService from '../services/execution';
import { ExecutionStatus } from '@prisma/client';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

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
  isAuthenticated,
  validateRequest(z.object({
    body: z.object({
      workflowId: z.string().uuid()
    })
  })),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const { workflowId } = req.body as { workflowId: string };
      const executionId = await executionService.startExecution(
        workflowId,
        req.user!.id,
        req.user!.orgId
      );
      res.json({ executionId });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Error creating execution:', error);
      res.status(500).json({ error: 'Failed to create execution' });
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
  isAuthenticated,
  validateRequest(z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      status: z.nativeEnum(ExecutionStatus),
      error: z.string().optional()
    })
  })),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { status, error } = req.body as { status: 'SUCCESS' | 'ERROR', error?: string };
      await executionService.completeExecution(id, status, error);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Error completing execution:', error);
      res.status(500).json({ error: 'Failed to complete execution' });
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
  isAuthenticated,
  validateRequest(z.object({
    params: z.object({
      id: z.string().uuid()
    }),
    body: z.object({
      toStateId: z.string().uuid(),
      metadata: z.record(z.any()).optional()
    })
  })),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params as { id: string };
      const { toStateId, metadata } = req.body as { toStateId: string, metadata?: any };
      const transitionId = await executionService.recordStateTransition(id, toStateId, metadata);
      res.json({ transitionId });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Error transitioning execution status:', error);
      res.status(500).json({ error: 'Failed to transition execution status' });
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
  isAuthenticated,
  validateRequest(z.object({ params: z.object({ id: z.string().uuid() })})),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const states = await executionService.getExecutionStates(
        (req.params as { id: string }).id
      );
      res.json(states);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Error getting execution states:', error);
      res.status(500).json({ error: 'Failed to get execution states' });
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
  isAuthenticated,
  validateRequest(z.object({ params: z.object({ id: z.string().uuid() })})),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const execution = await executionService.getExecutionById(
        (req.params as { id: string }).id
      );
      if (!execution) {
        throw new AppError('Execution not found', 404);
      }
      res.json(execution);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      logger.error('Error getting execution by ID:', error);
      res.status(500).json({ error: 'Failed to get execution by ID' });
    }
  }
);

export default router;