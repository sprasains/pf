// import { createClient } from 'redis'; // Removed direct redis import
import { logger } from '../utils/logger';
import { WorkflowTemplate } from '@pumpflix/shared'; // Import WorkflowTemplate from shared package
import { Prisma } from '@prisma/client'; // Keep Prisma import if needed elsewhere in the file
import { redisClient, safeRedisOperation } from '../utils/redisClient'; // Import shared client and wrapper

const CACHE_EXPIRY = {
  PREBUILT: 6 * 60 * 60, // 6 hours
  USER_GENERATED: 1 * 60 * 60, // 1 hour
};

export class CacheService {
  private client: typeof redisClient; // Use type of shared client
  private static instance: CacheService;

  private constructor() {
    // Use the shared redisClient instance
    this.client = redisClient;

    // Error handling is now handled by the shared client's listeners
    // but can add specific logging here if needed.
    // this.client.on('error', (err) => {
    //   logger.error('CacheService Redis Client Error:', err);
    // });
  }

  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Sets data in Redis cache with a given key and expiration time.
   * Uses safeRedisOperation to handle potential Redis errors gracefully.
   * @param key The cache key.
   * @param data The data to cache.
   * @param expiry The expiration time in seconds.
   */
  public async set(key: string, data: any, expiry: number = CACHE_EXPIRY.USER_GENERATED): Promise<void> {
    await safeRedisOperation(async () => {
      await this.client.setex(key, expiry, JSON.stringify(data));
    });
  }

  /**
   * Gets data from Redis cache using a given key.
   * Uses safeRedisOperation to handle potential Redis errors gracefully.
   * @param key The cache key.
   * @returns The cached data, parsed from JSON, or null if not found or an error occurs.
   */
  public async get<T>(key: string): Promise<T | null> {
    const cachedData = await safeRedisOperation(async () => {
      return this.client.get(key);
    }, null);

    if (cachedData) {
      try {
        return JSON.parse(cachedData) as T;
      } catch (error) {
        logger.error('Failed to parse cached data for key:', key, error);
        return null;
      }
    }
    return null;
  }

  /**
   * Deletes data from Redis cache using a given key.
   * Uses safeRedisOperation to handle potential Redis errors gracefully.
   * @param key The cache key.
   */
  public async del(key: string): Promise<void> {
    await safeRedisOperation(async () => {
      await this.client.del(key);
    });
  }

  /**
   * Caches a workflow template with a specific key and expiry.
   * Uses safeRedisOperation internally via this.set.
   * @param key The cache key.
   * @param template The workflow template to cache.
   * @param isPrebuilt Whether the template is prebuilt (uses a longer expiry).
   */
  public async cacheWorkflowTemplate(key: string, template: WorkflowTemplate, isPrebuilt: boolean = false): Promise<void> {
    const expiry = isPrebuilt ? CACHE_EXPIRY.PREBUILT : CACHE_EXPIRY.USER_GENERATED;
    await this.set(key, template, expiry);
  }

  /**
   * Retrieves a cached workflow template.
   * Uses safeRedisOperation internally via this.get.
   * @param key The cache key.
   * @returns The cached workflow template or null.
   */
  public async getCachedWorkflowTemplate(key: string): Promise<WorkflowTemplate | null> {
    return this.get<WorkflowTemplate>(key);
  }

  /**
   * Invalidates the cache for a specific workflow template.
   * Uses safeRedisOperation internally via this.del.
   * @param key The cache key.
   */
  public async invalidateWorkflowTemplateCache(key: string): Promise<void> {
    await this.del(key);
  }

  // Add other cache-related methods as needed, using safeRedisOperation
} 