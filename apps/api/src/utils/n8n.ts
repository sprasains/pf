import axios from 'axios';
import { logger } from './logger';

const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
const N8N_API_KEY = process.env.N8N_API_KEY;

if (!N8N_API_KEY) {
  logger.warn('N8N_API_KEY is not set');
}

export const n8nClient = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for logging
n8nClient.interceptors.response.use(
  (response) => {
    logger.debug('n8n API response', {
      url: response.config.url,
      method: response.config.method,
      status: response.status
    });
    return response;
  },
  (error) => {
    logger.error('n8n API error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message
    });
    return Promise.reject(error);
  }
); 