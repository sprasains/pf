export const performanceConfig = {
  // Cache settings
  cache: {
    defaultTTL: 60 * 60, // 1 hour in seconds
    maxSize: 1000, // Maximum number of items in cache
    cleanupInterval: 60 * 60 * 1000, // 1 hour in milliseconds
    patterns: {
      stats: 'stats:*',
      templates: 'templates:*',
      preferences: 'preferences:*',
      workflows: 'workflows:*',
      executions: 'executions:*'
    }
  },

  // Rate limiting settings
  rateLimit: {
    general: {
      points: 100,
      duration: 60,
      blockDuration: 60 * 15
    },
    auth: {
      points: 5,
      duration: 60,
      blockDuration: 60 * 30
    },
    api: {
      points: 1000,
      duration: 60,
      blockDuration: 60 * 5
    }
  },

  // Queue settings
  queue: {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: false
    },
    concurrency: {
      audit: 5,
      execution: 10
    },
    limiter: {
      max: 1000,
      duration: 1000
    }
  },

  // Performance monitoring settings
  monitoring: {
    slowRequestThreshold: 1000, // 1 second in milliseconds
    highMemoryThreshold: 50 * 1024 * 1024, // 50MB in bytes
    metricsRetention: 60 * 60 * 24, // 24 hours in seconds
    alertThresholds: {
      errorRate: 0.05, // 5% error rate
      responseTime: 2000, // 2 seconds
      memoryUsage: 0.8 // 80% of available memory
    }
  },

  // Database optimization settings
  database: {
    poolSize: 10,
    connectionTimeout: 5000,
    idleTimeout: 30000,
    maxQueryTime: 10000,
    slowQueryThreshold: 1000
  },

  // Redis settings
  redis: {
    maxRetries: 3,
    retryDelay: 1000,
    connectTimeout: 10000,
    maxConnections: 50,
    minConnections: 5
  },

  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    retention: {
      days: 30,
      maxSize: '100m'
    },
    sampling: {
      rate: 1.0,
      minLevel: 'warn'
    }
  }
}; 