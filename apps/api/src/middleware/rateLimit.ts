import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { metrics } from '../utils/metrics';
import { logger } from '../utils/logger';
import { redisClient } from '../utils/redisClient';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        [key: string]: any;
      };
    }
  }
}

// Rate limit configurations
const rateLimits = {
  workflow_execution: {
    points: 10, // Number of requests
    duration: 60, // Per minute
    blockDuration: 60 * 5 // Block for 5 minutes if limit exceeded
  },
  ai_prompts: {
    points: 5,
    duration: 60,
    blockDuration: 60 * 10
  },
  default: {
    points: 100,
    duration: 60,
    blockDuration: 60 * 2
  }
};

// Create rate limiters using the shared redisClient
const limiters = Object.entries(rateLimits).reduce((acc, [key, config]) => {
  acc[key] = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: `ratelimit:${key}`,
    points: config.points,
    duration: config.duration,
    blockDuration: config.blockDuration
  });
  return acc;
}, {} as Record<string, RateLimiterRedis>);

export const rateLimit = (type: keyof typeof rateLimits) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limiter = limiters[type] || limiters.default;
      const key = `${req.ip}:${req.user?.id || 'anonymous'}`;

      const limiterResult = await limiter.consume(key);

      // Add rate limit headers using remainingPoints from the result
      res.setHeader('X-RateLimit-Limit', String(rateLimits[type]?.points || rateLimits.default.points));
      res.setHeader('X-RateLimit-Remaining', String(limiterResult.remainingPoints));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000 + limiterResult.msBeforeNext / 1000)));

      next();
    } catch (error: any) {
      const retryAfter = Math.ceil(error.msBeforeNext / 1000) || 60;

      logger.warn('Rate limit exceeded', { 
        type,
        ip: req.ip,
        userId: req.user?.id,
        retryAfter: retryAfter
      });
      metrics.incRateLimitExceeded({ endpoint: type });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfter
      });
    }
  };
};

// Request throttling middleware
export function throttle(
  windowMs: number = 1000,
  maxRequests: number = 10
) {
  const requestTimestamps = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const timestamps = requestTimestamps.get(key) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // Check if rate limit exceeded
    if (validTimestamps.length >= maxRequests) {
      const oldestTimestamp = validTimestamps[0];
      const retryAfter = Math.ceil((oldestTimestamp + windowMs - now) / 1000);

      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        error: 'Too many requests, please try again later.',
        retryAfter,
      });
    }

    // Add current timestamp
    validTimestamps.push(now);
    requestTimestamps.set(key, validTimestamps);

    // Clean up old entries periodically
    if (Math.random() < 0.1) {
      for (const [k, timestamps] of requestTimestamps.entries()) {
        if (timestamps.length === 0) {
          requestTimestamps.delete(k);
        }
      }
    }

    next();
  };
}

// Export rate limit middleware functions
export const rateLimitMiddleware = {
  // API endpoints
  api: rateLimit('default'),

  // Authentication endpoints
  auth: rateLimit('ai_prompts'),

  // Export endpoints
  export: rateLimit('workflow_execution'),

  // Webhook endpoints
  webhook: rateLimit('default'),
}; 