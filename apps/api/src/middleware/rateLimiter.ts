import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { redisClient } from '../utils/redisClient';
import { logger } from '../utils/logger';

// Rate limiter configurations
const rateLimiterConfig = {
  points: 100, // Number of requests
  duration: 60, // Per minute
  blockDuration: 60 * 15 // Block for 15 minutes if limit exceeded
};

// Create rate limiters for different endpoints
const generalLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit:general',
  ...rateLimiterConfig
});

const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit:auth',
  points: 5, // Stricter limits for auth endpoints
  duration: 60,
  blockDuration: 60 * 30
});

const apiLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'ratelimit:api',
  points: 1000, // Higher limits for API endpoints
  duration: 60,
  blockDuration: 60 * 5
});

// Helper to get client identifier
const getClientIdentifier = (req: Request): string => {
  return req.headers['x-forwarded-for']?.toString() || 
         req.socket.remoteAddress || 
         'unknown';
};

// Rate limiter middleware factory
export const createRateLimiter = (limiter: RateLimiterRedis) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = getClientIdentifier(req);
      await limiter.consume(clientId);
      next();
    } catch (error) {
      logger.warn('Rate limit exceeded', {
        clientId: getClientIdentifier(req),
        path: req.path,
        method: req.method
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: error instanceof Error ? undefined : error.msBeforeNext
      });
    }
  };
};

// Export specific rate limiters
export const generalRateLimiter = createRateLimiter(generalLimiter);
export const authRateLimiter = createRateLimiter(authLimiter);
export const apiRateLimiter = createRateLimiter(apiLimiter);

// Middleware to reset rate limit on successful authentication
export const resetRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const clientId = getClientIdentifier(req);
  try {
    await redisClient.del(`ratelimit:auth:${clientId}`);
    next();
  } catch (error) {
    logger.error('Failed to reset auth rate limit', { clientId, error });
    next();
  }
};
