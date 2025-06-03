import { redisClient, safeRedisOperation } from './redisClient';
import { logger } from './logger';

// Cache interface
interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Key prefix
  tags?: string[]; // Cache tags for invalidation
}

// Default cache options
const defaultOptions: CacheOptions = {
  ttl: 60, // 1 minute
  prefix: 'pumpflix:',
};

/**
 * Fetch data from cache or source
 * @param key Cache key
 * @param fetcher Function to fetch data if not in cache
 * @param options Cache options
 */
export async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl, prefix, tags } = { ...defaultOptions, ...options };
  const cacheKey = `${prefix}${key}`;

  // Try to get from cache using safe operation
  const cached = await safeRedisOperation(async () => {
    const value = await redisClient.get(cacheKey);
    if (value) {
      logger.debug('Cache hit:', cacheKey);
    }
    return value;
  }, null);

  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch fresh data
  logger.debug('Cache miss:', cacheKey);
  const result = await fetcher();

  // Store in cache with expiry using safe operation
  await safeRedisOperation(async () => {
    await redisClient.setex(cacheKey, ttl!, JSON.stringify(result));

    // Store cache tags if provided using safe operation
    if (tags?.length) {
      const tagKey = `${prefix}tags:${cacheKey}`;
      await redisClient.sadd(tagKey, ...tags);
      await redisClient.expire(tagKey, ttl!);
    }
  });

  return result;
}

/**
 * Invalidate cache by key or tags
 * @param key Cache key or tag to invalidate
 * @param options Cache options
 */
export async function invalidateCache(
  key: string,
  options: CacheOptions = {}
): Promise<void> {
  const { prefix } = { ...defaultOptions, ...options };
  const cacheKey = `${prefix}${key}`;

  try {
    // Delete specific key
    await redisClient.del(cacheKey);

    // If key is a tag, delete all keys with that tag
    const tagKey = `${prefix}tags:${cacheKey}`;
    const taggedKeys = await redisClient.smembers(tagKey);
    if (taggedKeys.length) {
      await redisClient.del(...taggedKeys);
      await redisClient.del(tagKey);
    }
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
}

/**
 * Clear all cache entries with a specific prefix
 * @param prefix Cache key prefix
 */
export async function clearCache(prefix: string = defaultOptions.prefix!): Promise<void> {
  await safeRedisOperation(async () => {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length) {
      await redisClient.del(...keys);
    }
  });
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memory: number;
  hits: number;
  misses: number;
}> {
  // Use safe operation for getting stats
  const stats = await safeRedisOperation(async () => {
    const [keys, memory, info] = await Promise.all([
      redisClient.dbsize(),
      redisClient.info('memory'),
      redisClient.info('stats'),
    ]);

    const hits = parseInt(info.match(/keyspace_hits:(\d+)/)?.[1] || '0');
    const misses = parseInt(info.match(/keyspace_misses:(\d+)/)?.[1] || '0');

    return {
      keys,
      memory: parseInt(memory.match(/used_memory:(\d+)/)?.[1] || '0'),
      hits,
      misses,
    };
  }, { keys: 0, memory: 0, hits: 0, misses: 0 }); // Provide fallback value

  return stats as {
    keys: number;
    memory: number;
    hits: number;
    misses: number;
  };
} 