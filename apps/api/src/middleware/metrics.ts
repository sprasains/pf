import { Request, Response, NextFunction } from 'express';
import { metrics } from '../utils/metrics';
import { logger } from '../utils/logger';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  // Record response metrics when the request completes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    try {
      // Record request metrics
      metrics.recordHttpRequest(req.method, route, res.statusCode, duration);

      // Record error metrics for 4xx and 5xx responses
      if (res.statusCode >= 400) {
        metrics.recordHttpError(req.method, route, res.statusCode);
      }
    } catch (error) {
      logger.error('Error recording metrics', { error, route, method: req.method });
    }
  });

  next();
}; 