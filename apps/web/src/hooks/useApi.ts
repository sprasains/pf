import { useState, useCallback } from 'react';
import { logger } from '../utils/logger';
import { API_BASE_URL } from '../config';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function useApi<T = any>() {
  const [state, setState] = useState<ApiResponse<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const call = useCallback(async (endpoint: string, options: ApiOptions = {}) => {
    const { method = 'GET', headers = {}, body } = options;
    const url = `${API_BASE_URL}${endpoint}`;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Log API call
      logger.logApiCall(method, url, body);

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }

      // Log successful response
      logger.logApiResponse(method, url, response.status, data);

      setState({
        data,
        error: null,
        loading: false,
      });

      return data;
    } catch (error) {
      // Log error
      logger.logApiError(method, url, error as Error);

      setState({
        data: null,
        error: error as Error,
        loading: false,
      });

      throw error;
    }
  }, []);

  return {
    ...state,
    call,
  };
} 