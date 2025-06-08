import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { PrismaClient, SubscriptionStatus } from '@prisma/client';
import { BillingService } from '../services/billing';
import { isAuthenticated } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import Stripe from 'stripe';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();
const billingService = new BillingService();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Validation schemas
const invoiceSchema = z.object({
  organization_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  description: z.string(),
  due_date: z.string().datetime(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive(),
    total: z.number().positive()
  }))
});

const createInvoiceSchema = z.object({
  orgId: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  status: z.string(),
  dueDate: z.string().datetime(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    total: z.number().positive()
  }))
});

const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
});

// Validation schemas (using express-validator here)
const createSubscriptionValidation = [
  body('planId').isUUID().withMessage('Invalid plan ID'),
];

const createInvoiceValidation = [
  body('orgId').isUUID().withMessage('Invalid organization ID'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('currency').isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be a 3-letter code'),
  body('status').isString().withMessage('Status must be a string'), // Consider using enum validation
  body('dueDate').isISO8601().toDate().withMessage('Due date must be a valid date string'),
  body('items').isArray().withMessage('Items must be an array'),
  body('items.*.description').isString().notEmpty().withMessage('Item description cannot be empty'),
  body('items.*.quantity').isInt({ gt: 0 }).withMessage('Item quantity must be a positive integer'),
  body('items.*.unitPrice').isFloat({ gt: 0 }).withMessage('Item unit price must be a positive number'),
  body('items.*.total').isFloat({ gt: 0 }).withMessage('Item total must be a positive number'),
];

/**
 * @swagger
 * /api/billing/subscription:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/subscription',
  isAuthenticated,
  createSubscriptionValidation,
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      const { user, org } = req;

      if (!user || !org) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Create Stripe customer
      const customer = await billingService.createCustomer((req.user as any).email || '', (req.user as any).name || '');

      // Get plan details
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      // Check if plan has a Stripe price ID
      if (!plan.stripePriceId) {
         return res.status(500).json({ error: 'Subscription plan is not configured with a Stripe price ID.' });
      }

      // Create Stripe subscription
      const subscription = await billingService.createSubscription(
        customer.id,
        plan.stripePriceId
      );

      // Create subscription record
      const dbSubscription = await prisma.subscription.create({
        data: {
          orgId: (req.org as any).id,
          userId: (req.user as any).id,
          planId: plan.id,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: subscription.id,
          status: SubscriptionStatus.ACTIVE,
          startedAt: new Date(),
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
        },
      });

      res.status(201).json({
        subscription: dbSubscription,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
    }
  }
);

/**
 * @swagger
 * /api/billing/subscription/{id}:
 *   delete:
 *     summary: Cancel a subscription
 *     tags: [Billing]
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
 *         description: Subscription canceled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Server error
 */
router.delete(
  '/subscription/:id',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { org } = req;

      if (!org) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await prisma.subscription.findFirst({
        where: { id, orgId: (req.org as any).id },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }

      await billingService.cancelSubscription(subscription.stripeSubscriptionId);

      await prisma.subscription.update({
        where: { id },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      res.json({ message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
);

/**
 * @swagger
 * /api/billing/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Billing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook handled successfully
 *       400:
 *         description: Invalid webhook
 *       500:
 *         description: Server error
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      await billingService.handleWebhook(event);

      res.json({ received: true });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(400).json({ error: 'Webhook error' });
    }
  }
);

/**
 * @swagger
 * /api/billing/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Portal session created successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/portal',
  isAuthenticated,
  async (req, res) => {
    try {
      const { user, org } = req;

      if (!user || !org) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const subscription = await prisma.subscription.findFirst({
        where: { orgId: org.id },
        include: { plan: true },
      });

      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found' });
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.FRONTEND_URL}/billing`,
      });

      res.json({ url: session.url });
    } catch (error) {
      logger.error('Error creating portal session:', error);
      res.status(500).json({ error: 'Failed to create portal session' });
    }
  }
);

/**
 * @swagger
 * /api/billing/invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Invoice'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/invoices',
  isAuthenticated,
  createInvoiceValidation,
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { orgId, amount, currency, status, dueDate, items } = req.body;

      if (orgId !== (req.user as any).orgId) {
        throw new Error('Unauthorized to create invoice for this organization');
      }

      const invoice = await prisma.invoice.create({
        data: {
          orgId,
          number: 'INV-' + Date.now(),
          amount,
          currency,
          status,
          dueDate: new Date(dueDate),
          items: {
            create: items.map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total,
            })),
          },
        },
      });

      res.status(201).json(invoice);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/invoices',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          orgId: (req.user as any).orgId,
        },
        include: { items: true },
      });

      res.json(invoices);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 