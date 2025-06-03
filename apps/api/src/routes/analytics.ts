import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated } from '../middleware/auth';
import { sendSuccess, sendError, sendForbidden } from '../utils/apiResponse';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();
const prismaClient = new PrismaClient();

// Middleware to check if user is super admin
const isSuperAdmin = (req: any, res: any, next: any) => {
  if (req.user?.email !== 'sabal_prasain@hotmail.com') {
    return sendForbidden(res, 'Access denied. Super admin only.');
  }
  next();
};

const analyticsQuerySchema = z.object({
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
  userId: z.string().optional(),
  workflowId: z.string().optional(),
  status: z.enum(['success', 'failed', 'pending']).optional(),
  category: z.enum(['workflow', 'ai', 'revenue']).optional(),
});

/**
 * @swagger
 * /api/analytics/usage:
 *   get:
 *     summary: Get usage analytics for the current organization
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Usage analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/usage', requireAuth, validateRequest({ query: analyticsQuerySchema }), async (req, res) => {
  try {
    const { fromDate, toDate, userId, workflowId, status, category } = req.query;
    const org = req.org;

    if (!org) {
      return sendError(res, 'Organization not found', 404);
    }

    const where = {
      orgId: org.id,
      executedAt: {
        gte: new Date(fromDate as string),
        lte: new Date(toDate as string),
      },
      ...(userId && { userId: userId as string }),
      ...(workflowId && { workflowId: workflowId as string }),
      ...(status && { status: status as string }),
      ...(category && { category: category as string }),
    };

    const [executions, users, workflows] = await Promise.all([
      prismaClient.executionLog.findMany({
        where,
        include: {
          workflow: true,
          user: true,
        },
      }),
      prismaClient.user.findMany({
        where: {
          orgId: org.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      }),
      prismaClient.workflow.findMany({
        where: {
          orgId: org.id,
        },
        select: {
          id: true,
          name: true,
        },
      }),
    ]);

    // Calculate metrics
    const metrics = {
      totalExecutions: executions.length,
      successRate: executions.filter(e => e.status === 'success').length / executions.length,
      averageDuration: executions.reduce((acc, e) => acc + (e.duration || 0), 0) / executions.length,
      byUser: executions.reduce((acc, e) => {
        acc[e.userId] = (acc[e.userId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byWorkflow: executions.reduce((acc, e) => {
        acc[e.workflowId] = (acc[e.workflowId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    return sendSuccess(res, {
      metrics,
      users,
      workflows,
      executions,
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    return sendError(res, 'Failed to fetch analytics data');
  }
});

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Get global analytics (super admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Global analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/admin/metrics', isAuthenticated, isSuperAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    // Get total MRR
    const subscriptions = await prismaClient.subscription.findMany({
      where: {
        status: 'active',
      },
      include: {
        plan: true,
      },
    });

    const mrr = subscriptions.reduce((sum, sub) => sum + (sub.plan.price || 0), 0);

    // Get execution breakdown
    const executionsByOrg = await prismaClient.executionLog.groupBy({
      by: ['orgId'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    // Get churn rate
    const trialSubscriptions = await prismaClient.subscription.count({
      where: {
        status: 'trialing',
      },
    });

    const convertedTrials = await prismaClient.subscription.count({
      where: {
        status: 'active',
        trialEndsAt: {
          lt: new Date(),
        },
      },
    });

    const churnRate = trialSubscriptions > 0
      ? ((trialSubscriptions - convertedTrials) / trialSubscriptions) * 100
      : 0;

    // Get top active users
    const topUsers = await prismaClient.user.findMany({
      where: {
        lastActiveAt: {
          gte: startDate,
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
      take: 10,
      include: {
        organization: true,
      },
    });

    // Get top templates
    const topTemplates = await prismaClient.workflowTemplate.findMany({
      orderBy: {
        executionCount: 'desc',
      },
      take: 10,
      include: {
        organization: true,
      },
    });

    // Get execution heatmap
    const executionsByHour = await prismaClient.executionLog.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return sendSuccess(res, {
      mrr,
      executionsByOrg,
      churnRate,
      topUsers,
      topTemplates,
      executionsByHour,
    });
  } catch (error) {
    logger.error('Error fetching admin metrics:', error);
    return sendError(res, 'Failed to fetch admin metrics');
  }
});

/**
 * @swagger
 * /api/analytics/metrics/engagement:
 *   get:
 *     summary: Get user engagement metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/metrics/engagement', isAuthenticated, async (req, res) => {
  try {
    const { org } = req;
    const { start, end } = req.query;

    if (!org) {
      return sendError(res, 'Organization not found', 404);
    }

    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    // Get DAU/WAU/MAU
    const dailyActive = await prismaClient.user.count({
      where: {
        orgId: org.id,
        lastActiveAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    const weeklyActive = await prismaClient.user.count({
      where: {
        orgId: org.id,
        lastActiveAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    const monthlyActive = await prismaClient.user.count({
      where: {
        orgId: org.id,
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Get workflow success/failure ratio
    const workflowStats = await prismaClient.executionLog.groupBy({
      by: ['status'],
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    // Get average execution time
    const executionTimes = await prismaClient.executionLog.findMany({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        completedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    const avgExecutionTime = executionTimes.reduce((acc, curr) => {
      const duration = curr.completedAt!.getTime() - curr.startedAt.getTime();
      return acc + duration;
    }, 0) / executionTimes.length;

    // Get most used nodes
    const nodeUsage = await prismaClient.executionLog.findMany({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        nodes: true,
      },
    });

    const nodeCounts = nodeUsage.reduce((acc, curr) => {
      const nodes = JSON.parse(curr.nodes as string);
      nodes.forEach((node: string) => {
        acc[node] = (acc[node] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Get login time distribution
    const loginTimes = await prismaClient.user.findMany({
      where: {
        orgId: org.id,
      },
      select: {
        lastActiveAt: true,
      },
    });

    const loginDistribution = loginTimes.reduce((acc, curr) => {
      const hour = curr.lastActiveAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return sendSuccess(res, {
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive,
      },
      workflowStats,
      avgExecutionTime,
      nodeUsage: Object.entries(nodeCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      loginDistribution,
    });
  } catch (error) {
    logger.error('Error fetching engagement metrics:', error);
    return sendError(res, 'Failed to fetch engagement metrics');
  }
});

/**
 * @swagger
 * /api/analytics/metrics/ai:
 *   get:
 *     summary: Get AI usage metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/metrics/ai', isAuthenticated, async (req, res) => {
  try {
    const { org } = req;
    const { start, end } = req.query;

    if (!org) {
      return sendError(res, 'Organization not found', 404);
    }

    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    // Get prompt statistics
    const prompts = await prismaClient.promptLog.findMany({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalPrompts = prompts.length;
    const successfulPrompts = prompts.filter(p => p.status === 'success').length;
    const promptSuccessRate = (successfulPrompts / totalPrompts) * 100;

    // Get prompt categories
    const categories = prompts.reduce((acc, curr) => {
      const category = curr.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return sendSuccess(res, {
      totalPrompts,
      successfulPrompts,
      promptSuccessRate,
      categories: Object.entries(categories)
        .sort(([, a], [, b]) => b - a),
    });
  } catch (error) {
    logger.error('Error fetching AI metrics:', error);
    return sendError(res, 'Failed to fetch AI metrics');
  }
});

/**
 * @swagger
 * /api/analytics/metrics/revenue:
 *   get:
 *     summary: Get revenue metrics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 */
router.get('/metrics/revenue', isAuthenticated, async (req, res) => {
  try {
    const { org } = req;
    const { start, end } = req.query;

    if (!org) {
      return sendError(res, 'Organization not found', 404);
    }

    const startDate = start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end as string) : new Date();

    // Get subscription history
    const subscriptions = await prismaClient.subscription.findMany({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        plan: true,
      },
    });

    // Calculate LTV
    const ltv = subscriptions.reduce((acc, curr) => {
      return acc + (curr.plan.price || 0);
    }, 0);

    // Get trial conversion rate
    const trials = await prismaClient.subscription.count({
      where: {
        orgId: org.id,
        status: 'trialing',
      },
    });

    const convertedTrials = await prismaClient.subscription.count({
      where: {
        orgId: org.id,
        status: 'active',
        trialEndsAt: {
          lt: new Date(),
        },
      },
    });

    const conversionRate = trials > 0 ? (convertedTrials / trials) * 100 : 0;

    // Get revenue per execution
    const executions = await prismaClient.executionLog.count({
      where: {
        orgId: org.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const revenuePerExecution = executions > 0 ? ltv / executions : 0;

    return sendSuccess(res, {
      ltv,
      conversionRate,
      revenuePerExecution,
      subscriptionHistory: subscriptions.map(sub => ({
        plan: sub.plan.name,
        price: sub.plan.price,
        status: sub.status,
        startDate: sub.createdAt,
        endDate: sub.endsAt,
      })),
    });
  } catch (error) {
    logger.error('Error fetching revenue metrics:', error);
    return sendError(res, 'Failed to fetch revenue metrics');
  }
});

export default router; 