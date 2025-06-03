# PumpFlix Security Guide

## Overview

This guide outlines the security measures and best practices implemented in PumpFlix. The application follows a defense-in-depth approach with multiple layers of security controls.

## Authentication & Authorization

### JWT Authentication

```typescript
// apps/api/src/middleware/auth.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

### Role-Based Access Control (RBAC)

```typescript
// apps/api/src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
```

## Data Protection

### Encryption at Rest

```typescript
// apps/api/src/utils/encryption.ts
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY!, 'salt', 32);

export const encrypt = (text: string) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

export const decrypt = (encrypted: string, iv: string, authTag: string) => {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};
```

### Secure Password Storage

```typescript
// apps/api/src/utils/password.ts
import bcrypt from 'bcrypt';

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};
```

## API Security

### Rate Limiting

```typescript
// apps/api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../utils/cache';

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rate-limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
```

### Input Validation

```typescript
// apps/api/src/middleware/validation.ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: error.errors,
      });
    }
  };
};
```

## Network Security

### CORS Configuration

```typescript
// apps/api/src/middleware/cors.ts
import cors from 'cors';

export const corsOptions = cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
});
```

### SSL/TLS Configuration

```nginx
# nginx.conf
server {
  listen 443 ssl http2;
  server_name pumpflix.com;

  ssl_certificate /etc/nginx/ssl/pumpflix.crt;
  ssl_certificate_key /etc/nginx/ssl/pumpflix.key;
  
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
  ssl_prefer_server_ciphers off;
  
  ssl_session_timeout 1d;
  ssl_session_cache shared:SSL:50m;
  ssl_session_tickets off;
  
  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 8.8.8.8 8.8.4.4 valid=300s;
  resolver_timeout 5s;
  
  add_header Strict-Transport-Security "max-age=63072000" always;
}
```

## Security Headers

```typescript
// apps/api/src/middleware/security.ts
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.pumpflix.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});
```

## Database Security

### Connection Encryption

```typescript
// apps/api/src/utils/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Enable SSL for production
  ...(process.env.NODE_ENV === 'production' && {
    ssl: {
      rejectUnauthorized: true,
    },
  }),
});
```

### Query Sanitization

```typescript
// apps/api/src/utils/sanitize.ts
import { z } from 'zod';

export const sanitizeQuery = (query: any) => {
  const schema = z.object({
    limit: z.number().min(1).max(100).default(10),
    offset: z.number().min(0).default(0),
    sort: z.enum(['asc', 'desc']).default('desc'),
    filter: z.record(z.string()).optional(),
  });

  return schema.parse(query);
};
```

## Logging & Monitoring

### Security Logging

```typescript
// apps/api/src/utils/logger.ts
import winston from 'winston';

export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'security' },
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
  ],
});

export const logSecurityEvent = (event: string, data: any) => {
  securityLogger.info(event, {
    timestamp: new Date().toISOString(),
    ...data,
  });
};
```

### Audit Logging

```typescript
// apps/api/src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/database';

export const auditLog = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', async () => {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: req.method,
        resource: req.path,
        status: res.statusCode,
        duration: Date.now() - start,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });
  });
  
  next();
};
```

## Security Testing

### Automated Security Tests

```typescript
// apps/api/src/tests/security.test.ts
import request from 'supertest';
import { app } from '../app';

describe('Security Tests', () => {
  it('should prevent SQL injection', async () => {
    const response = await request(app)
      .get('/api/users')
      .query({ id: "1' OR '1'='1" });
    
    expect(response.status).toBe(400);
  });

  it('should prevent XSS attacks', async () => {
    const response = await request(app)
      .post('/api/comments')
      .send({
        content: '<script>alert("xss")</script>',
      });
    
    expect(response.status).toBe(400);
  });

  it('should enforce rate limiting', async () => {
    const requests = Array(101).fill(null).map(() =>
      request(app).get('/api/health')
    );
    
    const responses = await Promise.all(requests);
    const tooManyRequests = responses.filter(r => r.status === 429);
    
    expect(tooManyRequests.length).toBeGreaterThan(0);
  });
});
```

## Incident Response

### Security Incident Playbook

1. **Detection**
   - Monitor security logs
   - Review alert notifications
   - Check system metrics

2. **Analysis**
   - Identify affected systems
   - Determine scope of impact
   - Assess potential data exposure

3. **Containment**
   - Isolate affected systems
   - Block malicious IPs
   - Revoke compromised credentials

4. **Eradication**
   - Remove malware
   - Patch vulnerabilities
   - Update security controls

5. **Recovery**
   - Restore from backups
   - Verify system integrity
   - Resume normal operations

6. **Post-Incident**
   - Document incident details
   - Update security measures
   - Conduct lessons learned

## Compliance

### GDPR Compliance

```typescript
// apps/api/src/middleware/gdpr.ts
import { Request, Response, NextFunction } from 'express';

export const gdprCompliance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add GDPR compliance headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Log data processing activities
  if (req.user) {
    await prisma.dataProcessingLog.create({
      data: {
        userId: req.user.id,
        action: req.method,
        resource: req.path,
        purpose: 'Service provision',
        legalBasis: 'Contract',
      },
    });
  }
  
  next();
};
```

### Data Retention

```typescript
// apps/api/src/utils/retention.ts
import { prisma } from './database';

export const enforceDataRetention = async () => {
  const retentionPeriod = 365; // days
  
  await prisma.user.deleteMany({
    where: {
      lastLoginAt: {
        lt: new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000),
      },
      isActive: false,
    },
  });
  
  await prisma.auditLog.deleteMany({
    where: {
      createdAt: {
        lt: new Date(Date.now() - retentionPeriod * 24 * 60 * 60 * 1000),
      },
    },
  });
};
```

## Security Checklist

### Development

- [ ] Use secure coding practices
- [ ] Implement input validation
- [ ] Use parameterized queries
- [ ] Enable security headers
- [ ] Implement proper error handling
- [ ] Use secure session management
- [ ] Implement proper logging
- [ ] Use secure password storage
- [ ] Implement rate limiting
- [ ] Use HTTPS only

### Deployment

- [ ] Use secure configuration
- [ ] Enable SSL/TLS
- [ ] Configure firewalls
- [ ] Set up monitoring
- [ ] Implement backup strategy
- [ ] Use secure secrets management
- [ ] Enable audit logging
- [ ] Configure CORS properly
- [ ] Use secure dependencies
- [ ] Implement proper access controls

### Maintenance

- [ ] Regular security updates
- [ ] Vulnerability scanning
- [ ] Penetration testing
- [ ] Security training
- [ ] Incident response plan
- [ ] Regular backups
- [ ] Log monitoring
- [ ] Access review
- [ ] Compliance checks
- [ ] Security documentation

## Contact

For security concerns, please contact:
- Security Team: security@pumpflix.com
- Emergency: security-emergency@pumpflix.com
- Bug Bounty: bugbounty@pumpflix.com 