/// <reference path="../types/custom.d.ts" />
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import { isAuthenticated } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const sessionSchema = z.object({
  workflow_id: z.string().uuid(),
  client_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
});

/**
 * @swagger
 * /api/ws/sessions/start:
 *   post:
 *     summary: Start a WebSocket session
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflow_id
 *               - client_id
 *               - metadata
 *             properties:
 *               workflow_id:
 *                 type: string
 *                 format: uuid
 *               client_id:
 *                 type: string
 *                 format: uuid
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: WebSocket session started successfully
 */
router.post('/sessions/start',
  isAuthenticated,
  validateRequest(sessionSchema),
  async (req, res, next) => {
    try {
      const { workflow_id, client_id, metadata } = req.body;
      const userId = (req.user as any).id;

      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM start_websocket_session(
          ${userId}::uuid,
          ${workflow_id}::uuid,
          ${client_id}::uuid,
          ${JSON.stringify(metadata)}::jsonb
        )
      `;

      logger.info('WebSocket session started', { 
        userId,
        workflowId: workflow_id,
        clientId: client_id
      });
      metrics.incWorkflowExecutions({ workflow_id: workflow_id, status: 'session_started' });

      res.status(201).json(result[0]);
    } catch (error) {
      logger.error('Error starting WebSocket session', { error });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/ws/sessions/end:
 *   post:
 *     summary: End a WebSocket session
 *     tags: [WebSocket]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - session_id
 *             properties:
 *               session_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: WebSocket session ended successfully
 */
router.post('/sessions/end',
  isAuthenticated,
  validateRequest(z.object({
    session_id: z.string().uuid()
  })),
  async (req, res, next) => {
    try {
      const { session_id } = req.body;
      const userId = (req.user as any).id;

      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM end_websocket_session(
          ${session_id}::uuid,
          ${userId}::uuid
        )
      `;

      logger.info('WebSocket session ended', { 
        userId,
        sessionId: session_id
      });
      metrics.incWorkflowExecutions({ workflow_id: 'websocket', status: 'session_ended' });

      res.json(result[0]);
    } catch (error) {
      logger.error('Error ending WebSocket session', { error });
      next(error);
    }
  }
);

router.get('/sessions/active',
  isAuthenticated,
  async (req, res, next) => {
    try {
      const userId = (req.user as any).id;

      const sessions = await prisma.webSocketSession.findMany({
        where: {
          user_id: userId,
          ended_at: null
        },
        include: {
          workflow: true
        }
      });

      logger.info('Active WebSocket sessions retrieved', { userId });
      // metrics.recordCacheHit('websocket-sessions'); // Commenting out as it doesn't exist

      res.json(sessions);
    } catch (error) {
      logger.error('Error retrieving active WebSocket sessions', { error });
      next(error);
    }
  }
);

export default router; 