import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError } from 'express-validator';
import { AppError } from '../utils/error'; // Assuming you have an AppError class

export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => {
      // Safely access properties, checking if they exist and are of expected type
      const param = (error as any).param; // Use 'as any' to bypass strict typing for now
      const location = (error as any).location; // Use 'as any' to bypass strict typing for now

      return {
        msg: error.msg,
        // Only include param and location if they exist on the error object
        ...(param && { param }),
        ...(location && { location }),
      };
    });
    const err = new AppError('Validation Failed', 400, validationErrors);
    return next(err); // Call next with the error
  }
  next();
}; 