import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated, requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import { z } from 'zod';

// Define SsoProvider enum since it's not exported from @prisma/client
enum SsoProvider {
  SAML = 'SAML',
  OIDC = 'OIDC'
}

// Extend Express Session interface
declare module 'express-session' {
  interface SessionData {
    ssoState?: string;
  }
}

const prisma = new PrismaClient();
const router = express.Router();

// Validation schemas
const ssoConfigSchema = z.object({
  provider: z.nativeEnum(SsoProvider),
  metadataXml: z.string().optional(),
  issuer: z.string(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  redirectUri: z.string().url(),
});

// Get SSO configuration for organization
const getConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const config = await prisma.ssoConfig.findFirst({
      where: { orgId },
    });

    if (!config) {
      res.status(404).json({ error: 'SSO configuration not found' });
      return;
    }

    // Don't send sensitive data
    const { clientSecret, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    logger.error('Error fetching SSO config:', error);
    res.status(500).json({ error: 'Failed to fetch SSO configuration' });
  }
};

// Create/Update SSO configuration
const updateConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const configData = ssoConfigSchema.parse(req.body);

    const config = await prisma.ssoConfig.upsert({
      where: {
        orgId_provider: {
          orgId,
          provider: configData.provider,
        },
      },
      update: {
        ...configData,
        updatedAt: new Date(),
      },
      create: {
        ...configData,
        orgId,
      },
    });

    // Don't send sensitive data
    const { clientSecret, ...safeConfig } = config;
    res.json(safeConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error updating SSO config:', error);
    res.status(500).json({ error: 'Failed to update SSO configuration' });
  }
};

// Delete SSO configuration
const deleteConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    await prisma.ssoConfig.deleteMany({
      where: { orgId },
    });
    res.json({ message: 'SSO configuration deleted' });
  } catch (error) {
    logger.error('Error deleting SSO config:', error);
    res.status(500).json({ error: 'Failed to delete SSO configuration' });
  }
};

// SSO login redirect
const loginRedirect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const config = await prisma.ssoConfig.findFirst({
      where: { orgId },
    });

    if (!config) {
      res.status(404).json({ error: 'SSO configuration not found' });
      return;
    }

    // Store state in session for CSRF protection
    const state = Math.random().toString(36).substring(7);
    req.session.ssoState = state;

    let authUrl: string;
    if (config.provider === SsoProvider.SAML) {
      // SAML redirect logic
      authUrl = `/auth/saml/login?issuer=${encodeURIComponent(config.issuer)}&state=${state}`;
    } else {
      // OIDC redirect logic
      authUrl = `${config.issuer}/authorize?` + new URLSearchParams({
        client_id: config.clientId!,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
      }).toString();
    }

    res.json({ redirectUrl: authUrl });
  } catch (error) {
    logger.error('Error initiating SSO login:', error);
    res.status(500).json({ error: 'Failed to initiate SSO login' });
  }
};

// SSO callback handler
const callbackHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orgId } = req.params;
    const { code, state } = req.body;

    // Verify state to prevent CSRF
    if (state !== req.session?.ssoState) {
      res.status(400).json({ error: 'Invalid state parameter' });
      return;
    }

    const config = await prisma.ssoConfig.findFirst({
      where: { orgId },
    });

    if (!config) {
      res.status(404).json({ error: 'SSO configuration not found' });
      return;
    }

    let userInfo: any;
    if (config.provider === SsoProvider.SAML) {
      // SAML assertion handling
      const assertion = req.body.SAMLResponse;
      // Verify and parse SAML assertion
      // userInfo = await verifySamlAssertion(assertion, config);
    } else {
      // OIDC token exchange
      const tokenResponse = await fetch(`${config.issuer}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId!,
          client_secret: config.clientSecret!,
        }).toString(),
      });

      const tokens = await tokenResponse.json();
      
      // Get user info from ID token or userinfo endpoint
      const userInfoResponse = await fetch(`${config.issuer}/userinfo`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      userInfo = await userInfoResponse.json();
    }

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {
        name: userInfo.name,
        orgId,
      },
      create: {
        email: userInfo.email,
        name: userInfo.name,
        orgId,
      },
    });

    // Create session
    const session = await prisma.userSession.create({
      data: {
        userId: user.id,
        tokenHash: Math.random().toString(36).substring(7), // In production, use a proper token
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      },
    });

    // Log successful SSO login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        orgId,
        action: 'LOGIN',
        resource: 'SSO',
        metadata: {
          provider: config.provider,
          method: 'SSO',
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      token: session.tokenHash,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    logger.error('Error handling SSO callback:', error);
    res.status(500).json({ error: 'Failed to process SSO login' });
  }
};

// Register routes
router.get('/config/:orgId', isAuthenticated, getConfig);
router.post('/config/:orgId', isAuthenticated, requirePermission('sso', 'MANAGE'), updateConfig);
router.delete('/config/:orgId', isAuthenticated, requirePermission('sso', 'MANAGE'), deleteConfig);
router.get('/login/:orgId', loginRedirect);
router.post('/callback/:orgId', callbackHandler);

export default router; 