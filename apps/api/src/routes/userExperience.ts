import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import * as userExperienceService from '../services/userExperience';

const router = Router();

/**
 * @swagger
 * /api/user/preferences:
 *   post:
 *     summary: Set user preferences
 *     tags: [User Experience]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - theme
 *               - layout
 *             properties:
 *               theme:
 *                 type: string
 *                 enum: [LIGHT, DARK]
 *               layout:
 *                 type: string
 *                 enum: [GRID, LIST]
 *               defaultWorkspaceId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/preferences',
  isAuthenticated,
  validateRequest({
    body: z.object({
      theme: z.enum(['LIGHT', 'DARK']),
      layout: z.enum(['GRID', 'LIST']),
      defaultWorkspaceId: z.string().uuid().optional()
    })
  }),
  async (req, res, next) => {
    try {
      const preferenceId = await userExperienceService.setUserPreference(
        req.user.id,
        req.user.orgId,
        req.body
      );
      res.json({ preferenceId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [User Experience]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 theme:
 *                   type: string
 *                   enum: [LIGHT, DARK]
 *                 layout:
 *                   type: string
 *                   enum: [GRID, LIST]
 *                 defaultWorkspaceId:
 *                   type: string
 *                   format: uuid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Preferences not found
 *       500:
 *         description: Server error
 */
router.get(
  '/preferences',
  isAuthenticated,
  async (req, res, next) => {
    try {
      const preferences = await userExperienceService.getUserPreferences(
        req.user.id,
        req.user.orgId
      );
      res.json(preferences);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/activity:
 *   post:
 *     summary: Log user activity
 *     tags: [User Experience]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - context
 *             properties:
 *               action:
 *                 type: string
 *               context:
 *                 type: object
 *     responses:
 *       200:
 *         description: Activity logged successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post(
  '/activity',
  isAuthenticated,
  validateRequest({
    body: z.object({
      action: z.string(),
      context: z.record(z.any())
    })
  }),
  async (req, res, next) => {
    try {
      const logId = await userExperienceService.logUserAction(
        req.user.id,
        req.user.orgId,
        req.body.action,
        req.body.context
      );
      res.json({ logId });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/ui-config:
 *   get:
 *     summary: Get user UI configuration
 *     tags: [User Experience]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User UI configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferences:
 *                   type: object
 *                 recentWorkflows:
 *                   type: array
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Configuration not found
 *       500:
 *         description: Server error
 */
router.get(
  '/ui-config',
  isAuthenticated,
  async (req, res, next) => {
    try {
      const config = await userExperienceService.getUserUIConfig(
        req.user.id,
        req.user.orgId
      );
      res.json(config);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/user/activity:
 *   get:
 *     summary: Get recent user activity
 *     tags: [User Experience]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recent user activity
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
 *                   actionType:
 *                     type: string
 *                   context:
 *                     type: object
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get(
  '/activity',
  isAuthenticated,
  validateRequest({
    query: z.object({
      limit: z.number().int().min(1).max(100).optional()
    })
  }),
  async (req, res, next) => {
    try {
      const activities = await userExperienceService.getRecentActivity(
        req.user.id,
        req.user.orgId,
        req.query.limit
      );
      res.json(activities);
    } catch (error) {
      next(error);
    }
  }
);

export default router; 