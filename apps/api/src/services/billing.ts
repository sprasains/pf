import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

export class BillingService {
  async createCustomer(email: string, name: string) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
      });
      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer');
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    trialDays: number = 14
  ) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
      return subscription;
    } catch (error) {
      logger.error('Error creating Stripe subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Error canceling Stripe subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  async updateSubscription(
    subscriptionId: string,
    newPriceId: string
  ) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
      });
      return updatedSubscription;
    } catch (error) {
      logger.error('Error updating Stripe subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  async recordExecution(orgId: string, userId: string, workflowId: string) {
    try {
      // Get current subscription
      const subscription = await prisma.subscription.findFirst({
        where: { orgId, status: { in: ['trialing', 'active'] } },
        include: { plan: true },
      });

      if (!subscription) {
        throw new Error('No active subscription found');
      }

      // Check execution limits
      if (subscription.currentExecutions >= subscription.plan.executionLimit) {
        await this.createNotification(userId, 'usage_warning', {
          message: 'You have reached your execution limit',
          limit: subscription.plan.executionLimit,
        });
        throw new Error('Execution limit reached');
      }

      // Record execution
      const execution = await prisma.executionLog.create({
        data: {
          workflowId,
          userId,
          orgId,
          status: 'success',
        },
      });

      // Update execution count
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { currentExecutions: { increment: 1 } },
      });

      return execution;
    } catch (error) {
      logger.error('Error recording execution:', error);
      throw error;
    }
  }

  async createNotification(
    userId: string,
    type: string,
    data: { message: string; [key: string]: any }
  ) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          message: data.message,
          metadata: data,
        },
      });
      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw new Error('Failed to create notification');
    }
  }

  async checkTrialStatus(orgId: string) {
    try {
      const subscription = await prisma.subscription.findFirst({
        where: { orgId, status: 'trialing' },
      });

      if (!subscription) return;

      const now = new Date();
      const trialEndsAt = new Date(subscription.trialEndsAt);
      const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysLeft <= 3) {
        await this.createNotification(subscription.userId, 'trial_expiry', {
          message: `Your trial ends in ${daysLeft} days`,
          daysLeft,
        });
      }
    } catch (error) {
      logger.error('Error checking trial status:', error);
      throw new Error('Failed to check trial status');
    }
  }

  async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await prisma.subscription.update({
            where: { stripeSubscriptionId: subscription.id },
            data: { status: subscription.status },
          });
          break;

        case 'invoice.payment_failed':
          const invoice = event.data.object as Stripe.Invoice;
          const customer = await stripe.customers.retrieve(invoice.customer as string);
          const dbSubscription = await prisma.subscription.findFirst({
            where: { stripeCustomerId: customer.id },
          });
          if (dbSubscription) {
            await this.createNotification(dbSubscription.userId, 'payment_failed', {
              message: 'Your payment failed. Please update your payment method.',
              invoiceId: invoice.id,
            });
          }
          break;
      }
    } catch (error) {
      logger.error('Error handling Stripe webhook:', error);
      throw new Error('Failed to handle webhook');
    }
  }
} 