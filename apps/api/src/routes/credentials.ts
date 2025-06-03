import { Router } from 'express';
import { z } from 'zod';
import { CredentialService } from '../services/credentials';
import { validateRequest } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/error';
import { metrics } from '../utils/metrics';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createCredentialSchema = z.object({
  provider: z.enum(['GOOGLE_SHEETS', 'SLACK', 'AIRTABLE', 'ZAPIER', 'MAKERSUITE', 'CUSTOM']),
  credentials: z.record(z.any()),
  label: z.string().min(1),
  metadata: z.record(z.any()).optional(),
  expiresAt: z.string().datetime().optional()
});

const updateCredentialSchema = createCredentialSchema.partial();

const credentialSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  encrypted_value: z.string(),
  metadata: z.record(z.any()).optional()
});

const credentialUsageSchema = z.object({
  credential_id: z.string().uuid(),
  workflow_id: z.string().uuid(),
  execution_id: z.string().uuid()
});

// Routes
router.post(
  '/credentials',
  authenticate,
  validateRequest({ body: createCredentialSchema }),
  async (req, res) => {
    try {
      const credential = await CredentialService.createCredential({
        userId: req.user!.id,
        orgId: req.user!.orgId,
        ...req.body
      });

      res.status(201).json(credential);
    } catch (error) {
      logger.error('Failed to create credential', { error });
      res.status(500).json({
        error: 'Failed to create credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get(
  '/credentials',
  authenticate,
  async (req, res) => {
    try {
      const provider = req.query.provider as any;
      const credentials = await CredentialService.listCredentials(
        req.user!.id,
        req.user!.orgId,
        provider
      );

      res.json(credentials);
    } catch (error) {
      logger.error('Failed to list credentials', { error });
      res.status(500).json({
        error: 'Failed to list credentials',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.get(
  '/credentials/:id',
  authenticate,
  async (req, res) => {
    try {
      const credential = await CredentialService.getCredential(
        req.params.id,
        req.user!.id,
        req.user!.orgId
      );

      res.json(credential);
    } catch (error) {
      if (error instanceof Error && error.message === 'Credential not found') {
        return res.status(404).json({
          error: 'Credential not found'
        });
      }

      logger.error('Failed to get credential', { error });
      res.status(500).json({
        error: 'Failed to get credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.patch(
  '/credentials/:id',
  authenticate,
  validateRequest({ body: updateCredentialSchema }),
  async (req, res) => {
    try {
      const credential = await CredentialService.updateCredential(
        req.params.id,
        req.user!.id,
        req.user!.orgId,
        req.body
      );

      res.json(credential);
    } catch (error) {
      if (error instanceof Error && error.message === 'Credential not found') {
        return res.status(404).json({
          error: 'Credential not found'
        });
      }

      logger.error('Failed to update credential', { error });
      res.status(500).json({
        error: 'Failed to update credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.delete(
  '/credentials/:id',
  authenticate,
  async (req, res) => {
    try {
      await CredentialService.deleteCredential(
        req.params.id,
        req.user!.id,
        req.user!.orgId
      );

      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message === 'Credential not found') {
        return res.status(404).json({
          error: 'Credential not found'
        });
      }

      logger.error('Failed to delete credential', { error });
      res.status(500).json({
        error: 'Failed to delete credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

router.post(
  '/credentials/:id/validate',
  authenticate,
  async (req, res) => {
    try {
      const isValid = await CredentialService.validateCredential(
        req.params.id,
        req.user!.id,
        req.user!.orgId
      );

      res.json({ valid: isValid });
    } catch (error) {
      if (error instanceof Error && error.message === 'Credential not found') {
        return res.status(404).json({
          error: 'Credential not found'
        });
      }

      if (error instanceof Error && error.message === 'Credential has expired') {
        return res.status(400).json({
          error: 'Credential has expired'
        });
      }

      logger.error('Failed to validate credential', { error });
      res.status(500).json({
        error: 'Failed to validate credential',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/credentials/usage:
 *   post:
 *     summary: Log credential usage
 *     tags: [Credentials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - credential_id
 *               - workflow_id
 *               - execution_id
 *             properties:
 *               credential_id:
 *                 type: string
 *                 format: uuid
 *               workflow_id:
 *                 type: string
 *                 format: uuid
 *               execution_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Credential usage logged successfully
 */
router.post('/usage',
  authenticate,
  validateRequest(credentialUsageSchema),
  async (req, res, next) => {
    try {
      const { credential_id, workflow_id, execution_id } = req.body;
      const userId = req.user!.id;

      await prisma.$executeRaw`
        CALL log_credential_usage(
          ${credential_id}::uuid,
          ${userId}::uuid,
          ${workflow_id}::uuid,
          ${execution_id}::uuid
        )
      `;

      logger.info('Credential usage logged', { 
        userId, 
        credentialId: credential_id,
        workflowId: workflow_id,
        executionId: execution_id
      });
      metrics.recordWorkflowExecution(workflow_id, 'credential_used');

      res.json({ message: 'Credential usage logged successfully' });
    } catch (error) {
      logger.error('Error logging credential usage', { error });
      next(error);
    }
  }
);

router.get('/',
  authenticate,
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const result = await prisma.$queryRaw`
        SELECT * FROM get_credentials_for_workflow(${userId}::uuid)
      `;

      logger.info('Credentials retrieved', { userId });
      metrics.recordCacheHit('credentials');

      res.json(result);
    } catch (error) {
      logger.error('Error retrieving credentials', { error });
      next(error);
    }
  }
);

router.post('/',
  authenticate,
  validateRequest(credentialSchema),
  async (req, res, next) => {
    try {
      const { name, type, encrypted_value, metadata } = req.body;
      const userId = req.user!.id;
      const orgId = req.user!.orgId;

      const credential = await prisma.credential.create({
        data: {
          name,
          type,
          encrypted_value,
          metadata,
          organization_id: orgId,
          created_by: userId
        }
      });

      logger.info('Credential created', { userId, orgId, type });
      metrics.recordCacheMiss('credentials');

      res.status(201).json(credential);
    } catch (error) {
      logger.error('Error creating credential', { error });
      next(error);
    }
  }
);

export default router; 