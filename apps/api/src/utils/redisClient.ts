import Redis from 'ioredis';

const createRedisClient = () => {
  // Use NODE_ENV for development check, and a specific env var for explicit bypass
  if (process.env.NODE_ENV === 'development' || process.env.REDIS_DISABLED === 'true') {
    // Use require for ioredis-mock as it's a dev dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const IORedisMock = require('ioredis-mock');
    console.log('Using Redis mock for development');
    // ioredis-mock should be compatible with ioredis API
    const client = new IORedisMock();
    
    // Add basic error logging for mock client (if supported and desired)
    client.on('error', (error: any) => {
      console.warn('Development Redis client error (mock):', error.message);
    });

    return client;
  } else {
    // Production Redis client using ioredis
    const redisConfig = {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      // Connection options for production ioredis
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // Prevent commands from queuing when offline
      lazyConnect: false, // Connect immediately
    };

    // Use URL if provided, otherwise use config object
    const client = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : new Redis(redisConfig);

    // Add basic error logging for production client
    client.on('error', (error) => {
      console.error('Production Redis client error:', error);
    });
    client.on('connect', () => {
      console.log('Production Redis client connected');
    });

    return client;
  }
};

export const redisClient = createRedisClient();

// Optional: Create a safe operation wrapper
export const safeRedisOperation = async <T>(operation: () => Promise<T>, fallback: T | null = null): Promise<T | null> => {
  // In development with mock, just run the operation (mock doesn't throw connection errors from connection issues)
  // We still wrap in try-catch for potential errors within the operation itself
  if (process.env.NODE_ENV === 'development' || process.env.REDIS_DISABLED === 'true') {
     try {
        return await operation();
     } catch (error: any) {
        // Log other potential errors even with mock
        console.warn('Development Redis operation failed (mock):', error.message);
        return fallback;
     }
  } else {
    // In production, wrap with try-catch for connection or operation errors
    try {
      return await operation();
    } catch (error: any) {
      console.warn('Production Redis operation failed, using fallback:', error.message);
      return fallback;
    }
  }
}; 