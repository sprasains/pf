import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { redis } from '../lib/redis';

// Performance metrics interface
interface PerformanceMetrics {
  path: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  memoryUsage: number;
}

// Performance monitoring middleware
export const performanceMonitor = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed;

  // Capture response
  const originalSend = res.send;
  res.send = function (body: any) {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsage = endMemory - startMemory;

    const metrics: PerformanceMetrics = {
      path: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      timestamp: Date.now(),
      memoryUsage
    };

    // Log metrics
    logger.info('Request performance metrics', metrics);

    // Store metrics in Redis for analysis
    const key = `perf:${req.path}:${req.method}`;
    redis.lpush(key, JSON.stringify(metrics));
    redis.ltrim(key, 0, 999); // Keep last 1000 metrics
    redis.expire(key, 60 * 60 * 24); // Expire after 24 hours

    // Check for performance issues
    if (duration > 1000) { // Alert if request takes more than 1 second
      logger.warn('Slow request detected', {
        path: req.path,
        method: req.method,
        duration,
        statusCode: res.statusCode
      });
    }

    if (memoryUsage > 50 * 1024 * 1024) { // Alert if memory usage > 50MB
      logger.warn('High memory usage detected', {
        path: req.path,
        method: req.method,
        memoryUsage
      });
    }

    return originalSend.call(this, body);
  };

  next();
};

// Performance analysis functions
export const getPerformanceStats = async (path: string, method: string) => {
  const key = `perf:${path}:${method}`;
  const metrics = await redis.lrange(key, 0, -1);
  
  return metrics.map(m => JSON.parse(m) as PerformanceMetrics);
};

export const getAverageResponseTime = async (path: string, method: string) => {
  const metrics = await getPerformanceStats(path, method);
  if (metrics.length === 0) return 0;

  const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
  return totalDuration / metrics.length;
};

export const getErrorRate = async (path: string, method: string) => {
  const metrics = await getPerformanceStats(path, method);
  if (metrics.length === 0) return 0;

  const errorCount = metrics.filter(m => m.statusCode >= 400).length;
  return errorCount / metrics.length;
};

// Performance monitoring endpoint
export const performanceStats = async (req: Request, res: Response) => {
  try {
    const { path, method } = req.query;
    
    if (!path || !method) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'Path and method are required'
      });
    }

    const stats = {
      averageResponseTime: await getAverageResponseTime(path as string, method as string),
      errorRate: await getErrorRate(path as string, method as string),
      recentMetrics: await getPerformanceStats(path as string, method as string)
    };

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching performance stats', { error });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch performance statistics'
    });
  }
}; 