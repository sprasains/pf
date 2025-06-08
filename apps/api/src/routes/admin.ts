import { Router } from 'express';
import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import { isAuthenticated, hasRoleMiddleware } from '../middleware/authMiddleware';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/admin/metrics:
 *   get:
 *     summary: Get admin metrics
 *     tags: [Admin]
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
 *         description: Metrics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Server error
 */
router.get(
  '/metrics',
  isAuthenticated,
  hasRoleMiddleware([Role.ADMIN]),
  async (req, res) => {
    try {
      const { start, end } = req.query;
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      // Get executions by day
      const executionsByDay = await prisma.executionLog.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: true,
      });

      // Get subscription metrics
      const subscriptions = await prisma.subscription.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          plan: true,
        },
      });

      // Calculate metrics
      const totalRevenue = subscriptions.reduce(
        (sum, sub) => sum + (sub.plan?.price || 0),
        0
      );

      const activeSubscriptions = await prisma.subscription.count({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
      });

      const trialSubscriptions = await prisma.subscription.count({
        where: {
          status: SubscriptionStatus.TRIALING,
        },
      });

      const convertedTrials = await prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
          trialEndsAt: {
            lt: new Date(),
          },
        },
      });

      const trialConversionRate =
        trialSubscriptions > 0
          ? (convertedTrials / trialSubscriptions) * 100
          : 0;

      const churnedSubscriptions = await prisma.subscription.count({
        where: {
          status: SubscriptionStatus.CANCELLED,
          updatedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const churnRate =
        activeSubscriptions > 0
          ? (churnedSubscriptions / activeSubscriptions) * 100
          : 0;

      // Get plan distribution
      const planDistribution = await prisma.subscriptionPlan.findMany({
        include: {
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      });

      // Get usage violators
      const allSubscriptions = await prisma.subscription.findMany({
        where: {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
          },
        },
        include: {
          plan: true,
          organization: true,
        },
      });

      const usageViolators = allSubscriptions.filter(sub => sub.currentExecutions > (sub.plan?.executionLimit || 0));

      res.json({
        executionsByDay,
        totalRevenue,
        activeSubscriptions,
        trialConversionRate,
        churnRate,
        planDistribution: planDistribution.map((plan) => ({
          name: plan.name,
          count: plan._count.subscriptions,
          revenue: plan._count.subscriptions * (plan.price || 0),
        })),
        usageViolators: usageViolators.map((sub) => ({
          name: sub.organization.name,
          plan: sub.plan.name,
          usage: sub.currentExecutions,
          limit: sub.plan?.executionLimit || 0,
          overage:
            ((sub.currentExecutions - (sub.plan?.executionLimit || 0)) /
              (sub.plan?.executionLimit || 1)) *
            100,
        })),
      });
    } catch (error) {
      logger.error('Error fetching admin metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  }
);

export default router; 