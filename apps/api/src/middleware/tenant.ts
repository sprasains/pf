import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from './error';

const prisma = new PrismaClient();

export const tenantMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tenantId = req.user?.tenantId;
    const orgId = req.user?.orgId;

    if (!tenantId || !orgId) {
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

    // Add tenant context to request
    req.tenant = tenant;
    next();
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        slug: string;
        orgId: string;
      };
    }
  }
} 