import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './error';
import { logger } from '../utils/logger';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error', {
          errors: error.errors,
          path: req.path,
          method: req.method
        });

        throw new AppError(400, 'Validation error', true);
      }
      next(error);
    }
  };
};

// UUID validation
export const validateUUID = (param: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[param];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuid || !uuidRegex.test(uuid)) {
      logger.warn('Invalid UUID', { uuid, param });
      throw new AppError(400, `Invalid ${param} UUID format`, true);
    }

    next();
  };
};

// JSON validation
export const validateJSON = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('application/json')) {
    next();
  } else {
    logger.warn('Invalid content type', {
      contentType: req.get('content-type'),
      path: req.path,
      method: req.method
    });
    throw new AppError(415, 'Content-Type must be application/json', true);
  }
}; 