import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error('Error occurred', {
    error: err,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    requestId: req.id
  });

  // Increment error metric
  metrics.incrementError();

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      status: 'error',
      code: err.statusCode
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      status: 'error',
      code: 400
    });
  }

  // Handle database errors
  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      error: 'Database Error',
      message: 'Invalid request to database',
      status: 'error',
      code: 400
    });
  }

  // Handle unknown errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    error: 'Internal Server Error',
    message: isDevelopment ? err.message : 'An unexpected error occurred',
    status: 'error',
    code: 500,
    ...(isDevelopment && { stack: err.stack })
  });
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  metrics.incrementNotFound();

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    status: 'error',
    code: 404
  });
};

// Async handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 