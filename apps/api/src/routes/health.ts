import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     latency:
 *                       type: number
 *                 redis:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     latency:
 *                       type: number
 */
router.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - startTime;

    // Check Redis connection
    const redisStart = Date.now();
    await metrics.redis.ping();
    const redisLatency = Date.now() - redisStart;

    const health = {
      status: 'healthy',
      database: {
        status: 'connected',
        latency: dbLatency
      },
      redis: {
        status: 'connected',
        latency: redisLatency
      },
      timestamp: new Date().toISOString()
    };

    logger.info('Health check completed', { health });
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * @swagger
 * /api/debug:
 *   get:
 *     summary: Get debug information
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Debug information
 */
router.get('/debug', async (req, res) => {
  try {
    const debug = {
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      metrics: await metrics.getMetrics(),
      timestamp: new Date().toISOString()
    };

    logger.info('Debug info retrieved', { debug });
    res.json(debug);
  } catch (error) {
    logger.error('Error retrieving debug info', { error });
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 