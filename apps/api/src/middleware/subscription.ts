import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const checkSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { org } = req;

    if (!org) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        orgId: org.id,
        status: {
          in: ['active', 'trialing'],
        },
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        message: 'Please subscribe to execute workflows',
        action: 'upgrade',
      });
    }

    if (subscription.currentExecutions >= subscription.plan.executionLimit) {
      return res.status(403).json({
        error: 'Execution limit reached',
        message: 'You have reached your execution limit for this billing period',
        action: 'upgrade',
        limit: subscription.plan.executionLimit,
        current: subscription.currentExecutions,
      });
    }

    // Add subscription to request for later use
    req.subscription = subscription;
    next();
  } catch (error) {
    logger.error('Error checking subscription:', error);
    res.status(500).json({ error: 'Failed to check subscription status' });
  }
}; 