import express from 'express';
import passport from 'passport';
import { PrismaClient, Role, SubscriptionStatus, User as PrismaUser, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema } from '@pumpflix/shared';
import { AppError } from '../middleware/error';
import { z } from 'zod';
import { isAuthenticated, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validation';
import { authRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import {
  googleLogin,
  emailLogin,
  checkSession,
  logout,
  githubLogin,
  githubCallback,
  facebookLogin,
  facebookCallback
} from '../controllers/authController';
import { PrismaClientKnownRequestError } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const OrgSwitchInputSchema = z.object({
  orgId: z.string().uuid()
});

// Schema for validateRequest combining body, query, params
const OrgSwitchValidationSchema = z.object({
  body: OrgSwitchInputSchema,
  query: z.any(), // Allow any query params for now, refine if needed
  params: z.any() // Allow any route params for now, refine if needed
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user with organization and tenant
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - organizationName
 *               - organizationSlug
 *               - tenantName
 *               - tenantSlug
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               organizationSlug:
 *                 type: string
 *               tenantName:
 *                 type: string
 *               tenantSlug:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    const userName = name || 'New User'; // Fallback for name

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organization and tenant first
    const org = await prisma.organization.create({
      data: {
        name: `${userName}'s Organization`,
        slug: `${userName.toLowerCase().replace(/\s+/g, '-')}-org-${Date.now()}`,
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        name: `${userName}'s Tenant`,
        slug: `${userName.toLowerCase().replace(/\s+/g, '-')}-tenant-${Date.now()}`,
        orgId: org.id,
      },
    });

    // Create user and link to the created organization and tenant
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword, // Corrected field name
        name: userName, // Use potentially fallen back name
        provider: 'local',
        role: 'USER',
        orgId: org.id, // Link user to created org
        tenantId: tenant.id, // Link user to created tenant
      },
      include: {
        org: {
          include: {
            tenants: true,
          },
        },
        tenant: true, // Include tenant in user response
      },
    });

    // Log in the user
    req.login(user, (err) => {
      if (err) {
        logger.error('Error logging in user after registration:', err);
        return res.status(500).json({ message: 'Error logging in user' });
      }
      // Ensure req.user is typed correctly after login
      const loggedInUser = req.user as PrismaUser;
      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: loggedInUser.id,
          email: loggedInUser.email,
          name: loggedInUser.name,
          role: loggedInUser.role,
          orgId: loggedInUser.orgId,
          tenantId: loggedInUser.tenantId,
        },
      });
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    // Added check for PrismaClientKnownRequestError for unique constraint violations
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
       return res.status(409).json({ message: 'User with this email already exists' });
    }
    res.status(500).json({ message: 'Error registering user' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                 org:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many attempts
 */
router.post('/login', authRateLimiter, (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      logger.error('Error during login:', err);
      return res.status(500).json({ message: 'Error during login' });
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.login(user, (err) => {
      if (err) {
        logger.error('Error logging in user:', err);
        return res.status(500).json({ message: 'Error logging in user' });
      }
      // Ensure user is typed correctly after passport.authenticate
      const authenticatedUser = user as PrismaUser;
      res.json({
        message: 'Login successful',
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name,
          role: authenticatedUser.role,
          orgId: authenticatedUser.orgId,
          tenantId: authenticatedUser.tenantId,
        },
      });
    });
  })(req, res, next);
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                 org:
 *                   type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  // Ensure req.user is typed correctly
  const currentUser = req.user as PrismaUser;
  res.json({
    user: {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      role: currentUser.role,
      orgId: currentUser.orgId,
      tenantId: currentUser.tenantId,
    },
  });
});

/**
 * @swagger
 * /api/auth/orgs/switch:
 *   post:
 *     summary: Switch active organization
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orgId
 *             properties:
 *               orgId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Organization switched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 org:
 *                   type: object
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/orgs/switch',
  isAuthenticated,
  validateRequest(OrgSwitchValidationSchema), // Use the combined schema
  async (req, res, next) => {
    try {
      const { orgId } = req.body;

      // Query User model to check if the user belongs to the target organization
      const userInOrg = await prisma.user.findFirst({
        where: {
          id: req.user!.id,
          orgId: orgId
        },
        include: {
          org: true,
          tenant: true, // Include tenant to get tenantId for token
        }
      });


      if (!userInOrg || !userInOrg.org) {
        // Corrected AppError constructor
        throw new AppError(403, 'Organization not found or access denied');
      }

      const token = jwt.sign(
        {
          userId: userInOrg.id,
          orgId: userInOrg.org.id,
          tenantId: userInOrg.tenantId, // Include tenantId in token
        },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      logger.info('User switched organization', {
        userId: userInOrg.id,
        orgId: userInOrg.org.id
      });

      res.json({
        token,
        org: {
          id: userInOrg.org.id,
          name: userInOrg.org.name,
          slug: userInOrg.org.slug
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth login page
 */
router.get('/google', googleLogin);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback handler
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful Google login
 *       401:
 *         description: Google login failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home or send token
    res.redirect('/'); // Adjust redirect as needed
  }
);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth login page
 */
router.get('/github', githubLogin);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback handler
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful GitHub login
 *       401:
 *         description: GitHub login failed
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home or send token
    res.redirect('/'); // Adjust redirect as needed
  }
);

/**
 * @swagger
 * /api/auth/facebook:
 *   get:
 *     summary: Initiate Facebook OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirect to Facebook OAuth login page
 */
router.get('/facebook', facebookLogin);

/**
 * @swagger
 * /api/auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback handler
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Successful Facebook login
 *       401:
 *         description: Facebook login failed
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home or send token
    res.redirect('/'); // Adjust redirect as needed
  }
);

/**
 * @swagger
 * /api/auth/check-session:
 *   get:
 *     summary: Check current session and get user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *       401:
 *         description: Not authenticated
 */
router.get('/check-session', checkSession);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', logout);

export default router;