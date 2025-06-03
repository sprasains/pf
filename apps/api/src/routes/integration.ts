import { Router } from 'express';
import { IntegrationService } from '../services/integration';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

// Create credential
router.post(
  '/credentials',
  authenticate,
  validateRequest({
    body: z.object({
      provider: z.string(),
      credentials: z.any(),
      label: z.string()
    })
  }),
  async (req, res, next) => {
    try {
      const credential = await IntegrationService.createCredential(
        req.user.id,
        req.user.orgId,
        req.body.provider,
        req.body.credentials,
        req.body.label
      );
      res.json(credential);
    } catch (error) {
      next(error);
    }
  }
);

// Get credential
router.get(
  '/credentials/:id',
  authenticate,
  async (req, res, next) => {
    try {
      const credential = await IntegrationService.getCredential(
        req.params.id,
        req.user.id,
        req.user.orgId
      );
      res.json(credential);
    } catch (error) {
      next(error);
    }
  }
);

// List credentials
router.get(
  '/credentials',
  authenticate,
  validateRequest({
    query: z.object({
      provider: z.string().optional()
    })
  }),
  async (req, res, next) => {
    try {
      const credentials = await IntegrationService.listCredentials(
        req.user.id,
        req.user.orgId,
        req.query.provider as string | undefined
      );
      res.json(credentials);
    } catch (error) {
      next(error);
    }
  }
);

// Update credential
router.patch(
  '/credentials/:id',
  authenticate,
  validateRequest({
    body: z.object({
      credentials: z.any().optional(),
      label: z.string().optional()
    })
  }),
  async (req, res, next) => {
    try {
      const credential = await IntegrationService.updateCredential(
        req.params.id,
        req.user.id,
        req.user.orgId,
        req.body
      );
      res.json(credential);
    } catch (error) {
      next(error);
    }
  }
);

// Delete credential
router.delete(
  '/credentials/:id',
  authenticate,
  async (req, res, next) => {
    try {
      await IntegrationService.deleteCredential(
        req.params.id,
        req.user.id,
        req.user.orgId
      );
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router; 