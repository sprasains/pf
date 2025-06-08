/// <reference path="../types/custom.d.ts" />
import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import { isAuthenticated } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const timeRangeSchema = z.object({
  query: z.object({
    start_date: z.string().datetime(),
    end_date: z.string().datetime()
  })
});

/**
 * @swagger
 * /api/metrics/user/{id}:
 *   get:
 *     summary: Get user usage metrics
 *     tags: [Metrics]
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
 *         description: User metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_executions:
 *                   type: integer
 *                 monthly_executions:
 *                   type: integer
 *                 total_invoices:
 *                   type: integer
 *                 last_invoice_amount:
 *                   type: integer
 */
router.get('/usage',
  isAuthenticated,
  validateRequest(timeRangeSchema),
  async (req, res, next) => {
    try {
      const { start_date, end_date } = req.query;
      const userId = (req.user as any).id;

      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM get_user_usage_metrics(
          ${userId}::uuid,
          ${start_date}::timestamp,
          ${end_date}::timestamp
        )
      `;

      logger.info('User usage metrics retrieved', { 
        userId,
        startDate: start_date,
        endDate: end_date
      });
      // metrics.recordCacheHit('usage-metrics'); // Commenting out again as it doesn't exist

      res.json(result[0]);
    } catch (error) {
      logger.error('Error retrieving user usage metrics', { error });
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/workflows/{id}/credentials:
 *   get:
 *     summary: Get credentials for workflow
 *     tags: [Workflows]
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
 *         description: Credentials retrieved successfully
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
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 */
router.get('/workflow/:workflowId/credentials',
  isAuthenticated,
  validateRequest(z.object({
    params: z.object({
      workflowId: z.string().uuid()
    })
  })),
  async (req, res, next) => {
    try {
      const { workflowId } = req.params;
      const userId = (req.user as any).id;

      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM get_credentials_for_workflow(
          ${workflowId}::uuid,
          ${userId}::uuid
        )
      `;

      logger.info('Workflow credentials retrieved', { 
        userId,
        workflowId
      });
      // metrics.recordCacheHit('workflow-credentials'); // Commenting out again as it doesn't exist

      res.json(result);
    } catch (error) {
      logger.error('Error retrieving workflow credentials', { error });
      next(error);
    }
  }
);

// Get metrics endpoint - protected by auth and rate limiting
router.get(
  '/',
  isAuthenticated,
  apiRateLimiter,
  async (req, res) => {
    try {
      const metricsData = await metrics.getMetrics();
      res.set('Content-Type', 'application/json');
      res.json(metricsData);
    } catch (error) {
      logger.error('Error getting metrics', { error });
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }
);

export default router; 