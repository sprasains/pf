import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { tenantSchema } from '@pumpflix/shared';
import { AppError } from '../middleware/error';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/tenants/switch:
 *   post:
 *     summary: Switch to a different tenant
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenantId
 *             properties:
 *               tenantId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully switched tenant
 */
router.post('/switch', async (req, res, next) => {
  try {
    const { tenantId } = req.body;
    const userId = req.user?.id;
    const orgId = req.user?.orgId;

    if (!userId || !orgId) {
      throw new AppError(401, 'Unauthorized');
    }

    // Verify tenant belongs to user's organization
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: tenantId,
        orgId,
      },
    });

    if (!tenant) {
      throw new AppError(403, 'Access denied');
    }

    // Update user's tenant
    const user = await prisma.user.update({
      where: { id: userId },
      data: { tenantId },
      include: {
        tenant: true,
        org: true,
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
        org: {
          id: user.org.id,
          name: user.org.name,
          slug: user.org.slug,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/tenants:
 *   get:
 *     summary: Get all tenants for the user's organization
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of tenants
 */
router.get('/', async (req, res, next) => {
  try {
    const orgId = req.user?.orgId;

    if (!orgId) {
      throw new AppError(401, 'Unauthorized');
    }

    const tenants = await prisma.tenant.findMany({
      where: { orgId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

export const tenantRoutes = router; 