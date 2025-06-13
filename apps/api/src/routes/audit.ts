import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient, Role, Prisma, User as PrismaUser, Organization, Tenant } from '@prisma/client';
import { isAuthenticated, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const router = Router();

const AuditLogFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  actionType: z.string().optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: Get audit logs with filters
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       actionType:
 *                         type: string
 *                       details:
 *                         type: object
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           email:
 *                             type: string
 *                 total:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/logs',
  isAuthenticated,
  requireRole([Role.ADMIN]),
  validateRequest(z.object({ query: AuditLogFilterSchema })),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const {
        startDate,
        endDate,
        actionType,
        userId,
        limit = 10,
        offset = 0
      } = req.query;

      const where: Prisma.AuditLogWhereInput = {
        orgId: req.org.id,
        ...(startDate && { createdAt: { gte: new Date(startDate) } }),
        ...(endDate && { createdAt: { lte: new Date(endDate) } }),
        ...(actionType && { action: actionType }),
        ...(userId && { userId: userId })
      };

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: Number(limit),
          skip: Number(offset)
        }),
        prisma.auditLog.count({ where })
      ]);

      logger.info('Audit logs retrieved', {
        orgId: req.org.id,
        userId: req.user.id,
        filters: req.query
      });

      res.json({
        logs,
        total
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/audit/logs/export:
 *   get:
 *     summary: Export audit logs as CSV
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: CSV file of audit logs
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/logs/export',
  isAuthenticated,
  requireRole([Role.ADMIN]),
  validateRequest(z.object({
    query: z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional()
    })
  })),
  async (req: any, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate } = req.query;

      const logs = await prisma.auditLog.findMany({
        where: {
          orgId: req.org.id,
          ...(startDate && { createdAt: { gte: new Date(startDate) } }),
          ...(endDate && { createdAt: { lte: new Date(endDate) } })
        },
        include: {
          user: {
            select: {
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      const csv = [
        ['Timestamp', 'Action', 'User', 'Details', 'IP Address'].join(','),
        ...logs.map(log => [
          log.createdAt.toISOString(),
          log.action,
          log.user?.email || 'N/A',
          JSON.stringify(log.metadata),
          log.ipAddress || ''
        ].join(','))
      ].join('\n');

      logger.info('Audit logs exported', {
        orgId: req.org.id,
        userId: req.user.id,
        count: logs.length
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 