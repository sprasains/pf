import winston from 'winston';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define which transports the logger must use
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Create the logger instance
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// Helper to log to audit table
export const logToAudit = async (
  action: string,
  actorId: string,
  targetId: string | null,
  description: string,
) => {
  try {
    await prisma.auditLog.create({
      data: {
        action_type: action,
        actor_id: actorId,
        target_id: targetId,
        description,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log', { error });
  }
};

// Helper to log errors with stack trace
export const logError = (error: Error, context?: any) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

// Helper to log API responses
export const logApiResponse = (
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  userId?: string,
) => {
  logger.http(`${method} ${path}`, {
    statusCode,
    responseTime: `${responseTime}ms`,
    userId,
  });
};

// Helper to log workflow operations
export const logWorkflowOperation = (
  operation: string,
  workflowId: string,
  userId: string,
  details?: any,
) => {
  logger.info(`Workflow ${operation}`, {
    workflowId,
    userId,
    ...details,
  });

  logToAudit(
    `WORKFLOW_${operation.toUpperCase()}`,
    userId,
    workflowId,
    `Workflow ${operation}: ${workflowId}`,
  );
};

// Helper to log credential operations
export const logCredentialOperation = (
  operation: string,
  credentialId: string,
  userId: string,
  details?: any,
) => {
  logger.info(`Credential ${operation}`, {
    credentialId,
    userId,
    ...details,
  });

  logToAudit(
    `CREDENTIAL_${operation.toUpperCase()}`,
    userId,
    credentialId,
    `Credential ${operation}: ${credentialId}`,
  );
};

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration,
      user: req.user?.id,
      org: req.org?.id,
    });
  });
  next();
};

// Add error logging middleware
export const errorLogger = (err: any, req: any, res: any, next: any) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    user: req.user?.id,
    org: req.org?.id,
  });
  next(err);
}; 