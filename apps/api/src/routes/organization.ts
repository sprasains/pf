import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { organizationSchema } from '@pumpflix/shared';
import { AppError } from '../middleware/error';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/organizations:
 *   get:
 *     summary: Get all organizations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', async (req, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: {
        tenants: true,
        users: true,
      },
    });
    res.json(organizations);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   get:
 *     summary: Get organization by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Organization details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({
      where: { id: req.params.id },
      include: {
        tenants: true,
        users: true,
      },
    });

    if (!organization) {
      throw new AppError(404, 'Organization not found');
    }

    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post('/', async (req, res, next) => {
  try {
    const data = organizationSchema.parse(req.body);
    const organization = await prisma.organization.create({
      data,
      include: {
        tenants: true,
        users: true,
      },
    });
    res.status(201).json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   put:
 *     summary: Update organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.put('/:id', async (req, res, next) => {
  try {
    const data = organizationSchema.parse(req.body);
    const organization = await prisma.organization.update({
      where: { id: req.params.id },
      data,
      include: {
        tenants: true,
        users: true,
      },
    });
    res.json(organization);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/organizations/{id}:
 *   delete:
 *     summary: Delete organization
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Organization deleted
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.organization.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export const organizationRoutes = router; 