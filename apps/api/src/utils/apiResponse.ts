import { Response } from 'express';
import { logger } from './logger';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export const sendSuccess = <T>(res: Response, data: T, message?: string) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.json(response);
};

export const sendError = (res: Response, error: Error | string, status = 500) => {
  const errorMessage = error instanceof Error ? error.message : error;
  logger.error('API Error:', { error: errorMessage, status });
  
  const response: ApiResponse = {
    success: false,
    error: errorMessage,
  };
  return res.status(status).json(response);
};

export const sendValidationError = (res: Response, errors: any[]) => {
  const response: ApiResponse = {
    success: false,
    error: 'Validation Error',
    data: errors,
  };
  return res.status(400).json(response);
};

export const sendNotFound = (res: Response, message = 'Resource not found') => {
  const response: ApiResponse = {
    success: false,
    error: message,
  };
  return res.status(404).json(response);
};

export const sendUnauthorized = (res: Response, message = 'Unauthorized') => {
  const response: ApiResponse = {
    success: false,
    error: message,
  };
  return res.status(401).json(response);
};

export const sendForbidden = (res: Response, message = 'Forbidden') => {
  const response: ApiResponse = {
    success: false,
    error: message,
  };
  return res.status(403).json(response);
}; 