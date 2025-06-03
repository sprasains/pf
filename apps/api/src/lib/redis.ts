import { redisClient, safeRedisOperation } from '../utils/redisClient';
import { logger } from '../utils/logger';

// Cache helper with TTL and fallback
export async function withCache<T>(
  key: string,
  ttl: number,
  fallbackFn: () => Promise<T>
): Promise<T> {
  // Using safeRedisOperation for robust cache operations
  const cached = await safeRedisOperation(async () => {
    const value = await redisClient.get(key);
    if (value) {
      logger.debug('Cache hit', { key });
    }
    return value;
  }, null);

  if (cached) {
    return JSON.parse(cached);
  }

  logger.debug('Cache miss', { key });
  const data = await fallbackFn();
  await safeRedisOperation(() => redisClient.setex(key, ttl, JSON.stringify(data)));
  return data;
}

// Cache invalidation by pattern
export async function invalidateCache(pattern: string): Promise<void> {
  await safeRedisOperation(async () => {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info('Cache invalidated', { pattern, count: keys.length });
    }
  });
}

// Cache key generators
export const cacheKeys = {
  stats: (orgId: string) => `cache:stats:${orgId}`,
  templates: (orgId: string) => `cache:templates:${orgId}`,
  userPreferences: (userId: string) => `cache:preferences:${userId}`,
  workflow: (workflowId: string) => `cache:workflow:${workflowId}`,
  execution: (executionId: string) => `cache:execution:${executionId}`,
}; 