import { useState, useEffect } from 'react';
import { getUserUsageMetrics } from '../utils/api';
import { logger } from '../utils/logger';

interface UsageMetrics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  workflowStats: Array<{
    status: string;
    _count: number;
  }>;
  avgExecutionTime: number;
  nodeUsage: Array<[string, number]>;
  loginDistribution: Record<number, number>;
}

export const useUsageMetrics = (startDate: string, endDate: string) => {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data: UsageMetrics = await getUserUsageMetrics(startDate, endDate);
        setMetrics(data);
        logger.info('Engagement metrics fetched successfully', { startDate, endDate });
      } catch (err) {
        const errorToLog = err instanceof Error ? err : new Error('Failed to fetch metrics');
        setError(errorToLog);
        logger.error('Error fetching engagement metrics', errorToLog);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [startDate, endDate]);

  return { metrics, loading, error };
}; 