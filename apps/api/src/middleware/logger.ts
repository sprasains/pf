import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';

const prisma = new PrismaClient();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Helper function to redact sensitive headers
const redactSensitiveHeaders = (headers: any) => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const redactedHeaders = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (redactedHeaders[header]) {
      redactedHeaders[header] = '[REDACTED]';
    }
  });
  
  return redactedHeaders;
};

// Helper function to redact sensitive data from request body
const redactSensitiveData = (body: any) => {
  if (!body) return body;
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
  const redactedBody = { ...body };
  
  sensitiveFields.forEach(field => {
    if (redactedBody[field]) {
      redactedBody[field] = '[REDACTED]';
    }
  });
  
  return redactedBody;
};

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organization_id: string;
  };
}

export const requestLogger = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Log request details
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    headers: redactSensitiveHeaders(req.headers),
    body: redactSensitiveData(req.body),
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - start;
    const responseSize = Buffer.byteLength(body as string);
    
    // Log response details
    logger.info('Outgoing response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      responseSize: `${responseSize} bytes`
    });

    // Create audit log for authenticated requests
    if (req.user) {
      prisma.auditLog.create({
        data: {
          actionType: `${req.method}_${req.path}`,
          actorId: req.user.id,
          description: `${req.method} request to ${req.path} completed with status ${res.statusCode}`
        }
      }).catch(err => {
        logger.error('Failed to create audit log', { error: err.message });
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// Export logger instance for use in other parts of the application
export { logger }; 