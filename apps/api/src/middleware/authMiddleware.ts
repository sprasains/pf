import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, SubscriptionStatus, User as PrismaUser } from '@prisma/client';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      logger.warn('Authentication failed: No token provided', { ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; orgId: string; tenantId: string; };
    
    const session = await prisma.userSession.findFirst({
      where: {
        userId: decoded.userId,
        tokenHash: token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!session || !session.user) {
      logger.warn('Authentication failed: Invalid or expired session', { userId: decoded.userId, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = session.user as any;
    
    const org = await prisma.organization.findUnique({ where: { id: session.user.orgId } });
    const tenant = await prisma.tenant.findUnique({ where: { id: session.user.tenantId } });
    
    if(org) req.org = org as any;
    if(tenant) req.tenant = tenant as any;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Authentication failed: Invalid token', { error: error.message, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(401).json({ error: 'Invalid token' });
     } else if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Authentication failed: Token expired', { error: error.message, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(401).json({ error: 'Token expired' });
     }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.role || !req.org) {
        logger.warn('Permission check failed: User, role, or org missing', { userId: req.user?.id, orgId: req.org?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(403).json({ error: 'Permission denied' });
      }

      const policy = await prisma.rolePolicy.findUnique({
        where: {
          role_resource_action_orgId: {
            role: req.user.role,
            resource,
            action,
            orgId: req.org.id
          }
        }
      });

      if (!policy?.allow) {
        logger.warn('Permission check failed: Policy not found or denied', {
          userId: req.user.id,
          orgId: req.org.id,
          resource,
          action,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        return res.status(403).json({ error: 'Permission denied' });
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          orgId: req.user.orgId,
          action: action,
          resource: resource,
          resourceId: undefined,
          metadata: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: Object.keys(req.body as object).reduce((acc: { [key: string]: any }, key: string) => {
                if (key.toLowerCase().includes('password')) {
                    acc[key] = '[REDACTED]';
                } else {
                    acc[key] = (req.body as any)[key];
                }
                return acc;
            }, {}),
          } as any,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
       if (error instanceof AppError && error.statusCode === 403) {
           return res.status(403).json({ error: error.message });
       }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

export const checkOrgAccessMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.id || !req.org || !req.org.id) {
         logger.warn('Org access check failed: User or Org missing', { userId: req.user?.id, orgId: req.org?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(403).json({ error: 'Organization access denied' });
    }

    const requestedOrgId = req.params.orgId || req.body.orgId || req.org.id;

    if (req.user.orgId !== requestedOrgId) {
        logger.warn('Org access check failed: User org mismatch', { userId: req.user.id, userOrgId: req.user.orgId, requestedOrgId: requestedOrgId, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(403).json({ error: 'Organization access denied' });
    }

    next();
  } catch (error) {
    logger.error('Organization access check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateSsoSessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ssoToken = req.headers['x-sso-token'];
    if (!ssoToken || typeof ssoToken !== 'string') {
        logger.warn('SSO session validation failed: No token or invalid format', { ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ error: 'SSO session required' });
    }

    const decoded = jwt.verify(ssoToken, process.env.SSO_SECRET!) as {
       email: string;
       name?: string;
       orgId: string;
    };
    
    if (!decoded.email || !decoded.orgId) {
         logger.warn('SSO session validation failed: Missing required data in token', { decodedPayload: decoded, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(401).json({ error: 'Invalid SSO token payload' });
    }

    let user = await prisma.user.findUnique({
      where: { email: decoded.email },
      include: { org: { include: { tenants: true } } },
    });

    if (!user) {
        const org = await prisma.organization.findUnique({ where: { id: decoded.orgId }, include: { tenants: true } });
        
        if (!org || !org.tenants[0]) {
             logger.error('SSO session validation failed: Organization or tenant not found for new user', { orgIdInToken: decoded.orgId, ip: req.ip, userAgent: req.headers['user-agent'] });
             return res.status(400).json({ error: 'Organization or tenant not found' });
        }

      user = await prisma.user.create({
        data: {
          email: decoded.email,
          name: decoded.name,
          provider: 'sso',
          role: 'USER',
          orgId: org.id,
          tenantId: org.tenants[0].id,
        },
        include: { org: { include: { tenants: true } } },
      });
    }
    
     if (!user.tenantId && user.org?.tenants[0]) {
         user.tenantId = user.org.tenants[0].id;
         await prisma.user.update({ where: { id: user.id }, data: { tenantId: user.tenantId } });
     } else if (!user.tenantId) {
          logger.error('SSO session validation failed: Could not assign tenant to user', { userId: user.id, orgId: user.orgId, ip: req.ip, userAgent: req.headers['user-agent'] });
           return res.status(500).json({ error: 'Could not assign tenant to user' });
     }

    req.user = user;
     req.org = user.org;
     req.tenant = user.org.tenants[0];

    next();
  } catch (error) {
    logger.error('SSO session validation error:', error);
     if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('SSO session validation failed: Invalid token', { error: error.message, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(401).json({ error: 'Invalid SSO token' });
     } else if (error instanceof jwt.TokenExpiredError) {
        logger.warn('SSO session validation failed: Token expired', { error: error.message, ip: req.ip, userAgent: req.headers['user-agent'] });
        return res.status(401).json({ error: 'SSO token expired' });
     }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const requireRole = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
       logger.warn('Role check failed: User or role missing', { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
      return next(new AppError('Unauthorized', 401));
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Role-based access denied', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
      });
      return next(new AppError('Forbidden', 403));
    }

    next();
  };
}

export const checkPermissionMiddleware = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role || !req.org) {
       logger.warn('Permission check failed: User, role, or org missing', { userId: req.user?.id, orgId: req.org?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
      return next(new AppError('Unauthorized', 401));
    }

    try {
      const policy = await prisma.rolePolicy.findUnique({
        where: {
          role_resource_action_orgId: {
            role: req.user.role,
            resource,
            action,
            orgId: req.org.id
          }
        },
        select: {
            allow: true
        }
      });

      if (!policy || !policy.allow) {
        logger.warn('Permission check failed: Policy not found or denied', {
          userId: req.user.id,
          orgId: req.org.id,
          resource,
          action,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
        return next(new AppError('Forbidden', 403));
      }

      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          orgId: req.user.orgId,
          action: action,
          resource: resource,
          resourceId: undefined,
          metadata: {
            method: req.method,
            path: req.path,
            params: req.params,
            query: req.query,
            body: Object.keys(req.body as object).reduce((acc: { [key: string]: any }, key: string) => {
                if (key.toLowerCase().includes('password')) {
                    acc[key] = '[REDACTED]';
                } else {
                    acc[key] = (req.body as any)[key];
                }
                return acc;
            }, {}),
          } as any,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      });

      next();
    } catch (error) {
      logger.error('Permission check error:', error);
       if (error instanceof AppError && error.statusCode) {
             return res.status(error.statusCode).json({ error: error.message });
        } else if (error instanceof Error) {
            logger.error('Unexpected permission check error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
       return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export const hasRoleMiddleware = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
       logger.warn('Has role check failed: User or role missing', { userId: req.user?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
      });
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};

export const hasOrgAccessMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id || !req.org || !req.org.id) {
     logger.warn('Has org access check failed: User or Org missing', { userId: req.user?.id, orgId: req.org?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
    return res.status(401).json({ message: 'Not authenticated or organization context missing' });
  }

  if (req.user.orgId !== req.org.id) {
      logger.warn('Has org access check failed: User org mismatch', { userId: req.user.id, userOrgId: req.user.orgId, reqOrgId: req.org.id, ip: req.ip, userAgent: req.headers['user-agent'] });
     return res.status(403).json({ message: 'Insufficient permissions for this organization' });
  }

  next();
};

export const hasTenantAccess = (req: Request, res: Response, next: NextFunction) => {
   if (!req.user || !req.user.id || !req.tenant || !req.tenant.id) {
       logger.warn('Has tenant access check failed: User or Tenant missing', { userId: req.user?.id, tenantId: req.tenant?.id, ip: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(401).json({ message: 'Not authenticated or tenant context missing' });
    }

    if (req.user.tenantId !== req.tenant.id) {
       logger.warn('Has tenant access check failed: User tenant mismatch', { userId: req.user.id, userTenantId: req.user.tenantId, reqTenantId: req.tenant.id, ip: req.ip, userAgent: req.headers['user-agent'] });
       return res.status(403).json({ message: 'Insufficient permissions for this tenant' });
    }

    next();
};

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
   if (!req.user) {
        logger.debug('Auth rate limiter applied to unauthenticated request', { ip: req.ip, userAgent: req.headers['user-agent'] });
   } else {
       logger.debug('Auth rate limiter applied to authenticated request', { userId: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] });
   }
    next();
};

export const sessionManager = (req: Request, res: Response, next: NextFunction) => {
   if (!req.user) {
        logger.debug('Session manager applied to unauthenticated request', { ip: req.ip, userAgent: req.headers['user-agent'] });
   } else {
       logger.debug('Session manager applied to authenticated request', { userId: req.user.id, ip: req.ip, userAgent: req.headers['user-agent'] });
   }
    next();
}; 