import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schemas
const emailLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const googleLoginSchema = z.object({
  token: z.string(),
});

export const googleLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = googleLoginSchema.parse(req.body);
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new AppError('Invalid Google token or missing email', 401);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: payload.email },
      include: {
        org: true,
      },
    });

    if (!user) {
      // Create new user with default org and tenant
      const defaultOrgName = `${payload.name || payload.email.split('@')[0]}'s Organization`;
      const defaultOrgSlug = `${(payload.name || payload.email.split('@')[0]).toLowerCase().replace(/\s+/g, '-')}-org-${Date.now()}`;

      user = await prisma.user.create({
        data: {
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          provider: 'google',
          role: 'USER',
          org: {
            create: {
              name: defaultOrgName,
              slug: defaultOrgSlug,
              tenants: {
                create: {
                  name: 'Default Tenant', // You might want to make this dynamic
                  slug: `default-tenant-${Date.now()}`,
                },
              },
            },
          },
        },
        include: {
          org: {
             include: { tenants: true }
          },
        },
      });
    }
     // Ensure user object includes tenantId after creation/finding
     const userWithTenant = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          org: {
            include: { tenants: true }
          },
        },
     });

     if (!userWithTenant || !userWithTenant.org?.tenants[0]) {
        throw new AppError('Could not retrieve user with organization and tenant', 500);
     }

    // Create session
    const sessionToken = jwt.sign(
      { userId: userWithTenant.id, orgId: userWithTenant.orgId, tenantId: userWithTenant.tenantId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    await prisma.userSession.create({
      data: {
        userId: userWithTenant.id,
        // Assuming tokenHash exists and is the correct field based on schema
        tokenHash: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    logger.info('Google login successful', { userId: userWithTenant.id });

    res.json({
      token: sessionToken,
      user: {
        id: userWithTenant.id,
        email: userWithTenant.email,
        name: userWithTenant.name,
        role: userWithTenant.role,
        orgId: userWithTenant.orgId,
        tenantId: userWithTenant.tenantId,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const emailLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = emailLoginSchema.parse(req.body);

    // --- Start of added bypass logic ---
    if (email === 'admin@pumpflix.com') {
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@pumpflix.com' },
        include: {
          org: {
             include: { tenants: true }
          },
        },
      });

      if (!adminUser || !adminUser.org?.tenants[0]) {
        // Admin user not found or missing org/tenant
        throw new AppError('Admin user not found or configuration error', 404);
      }

      // Create session for admin user without password check
      const sessionToken = jwt.sign(
        { userId: adminUser.id, orgId: adminUser.orgId, tenantId: adminUser.tenantId },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      await prisma.userSession.create({
        data: {
          userId: adminUser.id,
          // Assuming tokenHash exists and is the correct field based on schema
          tokenHash: sessionToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      logger.info('Admin login bypass successful', { userId: adminUser.id });

      return res.json({
        message: 'Admin login successful (bypass)',
        token: sessionToken,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name, // Safely access name
          role: adminUser.role, // Safely access role
          orgId: adminUser.orgId, // Safely access orgId
          tenantId: adminUser.tenantId, // Safely access tenantId
        },
      });
    }
    // --- End of added bypass logic ---


    // --- Existing logic for other users ---
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        org: {
           include: { tenants: true }
        },
      },
    });

    // Check if user exists AND has a password (for non-bypass login)
    if (!user || !user.password_hash) { // Assuming password field is named password_hash in schema
      throw new AppError('Invalid credentials', 401);
    }

    // Safely compare password with hashed password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      throw new AppError('Invalid credentials', 401);
    }
     // Ensure user object includes tenantId
     const userWithTenant = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          org: {
            include: { tenants: true }
          },
        },
     });

    if (!userWithTenant || !userWithTenant.org?.tenants[0]) {
        throw new AppError('Could not retrieve user with organization and tenant', 500);
     }

    // Create session for regular user
    const sessionToken = jwt.sign(
      { userId: userWithTenant.id, orgId: userWithTenant.orgId, tenantId: userWithTenant.tenantId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    await prisma.userSession.create({
      data: {
        userId: userWithTenant.id,
        // Assuming tokenHash exists and is the correct field based on schema
        tokenHash: sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    logger.info('Email login successful', { userId: userWithTenant.id });

    res.json({
      message: 'Login successful',
      token: sessionToken,
      user: {
        id: userWithTenant.id,
        email: userWithTenant.email,
        name: userWithTenant.name, // Safely access name
        role: userWithTenant.role, // Safely access role
        orgId: userWithTenant.orgId, // Safely access orgId
        tenantId: userWithTenant.tenantId, // Safely access tenantId
      },
    });
    // --- End of existing logic ---

  } catch (error) {
    next(error);
  }
};

export const checkSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Assuming req.user is populated by authentication middleware
    // and has at least an 'id' property
    if (!req.user || !req.user.id) { // Check for req.user and its id
      throw new AppError('Not authenticated or user ID missing', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        org: {
           include: { tenants: true }
        },
      },
    });

    if (!user || !user.org?.tenants[0]) {
      throw new AppError('User not found or configuration error', 404);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name, // Safely access name
        role: user.role, // Safely access role
        orgId: user.orgId,
        tenantId: user.tenantId, // Include tenantId
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Assuming req.user is populated by authentication middleware
    // and has at least an 'id' property
    if (!req.user || !req.user.id) { // Check for req.user and its id
      throw new AppError('Not authenticated or user ID missing', 401);
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await prisma.userSession.deleteMany({
        where: {
          userId: req.user.id,
          // Assuming tokenHash exists and is the correct field based on schema
          tokenHash: token,
        },
      });
    }

    logger.info('User logged out', { userId: req.user.id });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Placeholder exports for GitHub and Facebook OAuth
// Added explicit types for req and res to avoid 'implicitly has an "any" type' errors
export const githubLogin = (req: Request, res: Response) => {
  // Placeholder
};

export const githubCallback = (req: Request, res: Response) => {
  // Placeholder
};

export const facebookLogin = (req: Request, res: Response) => {
  // Placeholder
};

export const facebookCallback = (req: Request, res: Response) => {
  // Placeholder
}; 