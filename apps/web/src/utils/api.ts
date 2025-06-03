import axios from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '../config';
import { logger } from './logger';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (!data.success) {
      message.error(data.error || 'An error occurred');
      return Promise.reject(new Error(data.error));
    }
    return data.data;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Handle unauthorized
          window.location.href = '/auth/login';
          break;
        case 403:
          message.error('You do not have permission to perform this action');
          break;
        case 404:
          message.error('Resource not found');
          break;
        case 422:
          message.error(data.error || 'Validation error');
          break;
        default:
          message.error(data.error || 'An error occurred');
      }
    } else {
      message.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
  },
  billing: {
    subscription: '/api/billing/subscription',
    portal: '/api/billing/portal',
    webhook: '/api/billing/webhook',
  },
  analytics: {
    usage: '/api/analytics/usage',
    engagement: '/api/analytics/metrics/engagement',
    ai: '/api/analytics/metrics/ai',
    revenue: '/api/analytics/metrics/revenue',
  },
  admin: {
    metrics: '/api/admin/metrics',
  },
  workflow: {
    list: '/api/workflows',
    execute: (id: string) => `/api/workflows/${id}/execute`,
  },
};

export default api;

// Workflow Management
export const createWorkflow = async (data: {
  name: string;
  description: string;
  json_schema: any;
}) => {
  const response = await fetch(`${API_BASE_URL}/workflows`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const logWorkflowExecution = async (workflowId: string, data: {
  status: string;
  input_data: any;
  output_data: any;
}) => {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/execute`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

// Billing
export const createInvoice = async (data: {
  organization_id: string;
  amount: number;
  currency: string;
  description: string;
  due_date: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}) => {
  const response = await fetch(`${API_BASE_URL}/billing/invoices`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

// AI Templates
export const saveAIPromptTemplate = async (data: {
  name: string;
  description: string;
  template: string;
  variables: string[];
  category: string;
  metadata?: any;
}) => {
  const response = await fetch(`${API_BASE_URL}/ai/templates`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

// Credentials
export const logCredentialUsage = async (data: {
  credential_id: string;
  workflow_id: string;
  execution_id: string;
}) => {
  const response = await fetch(`${API_BASE_URL}/credentials/usage`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

// WebSocket Sessions
export const startWebSocketSession = async (data: {
  workflow_id: string;
  client_id: string;
  metadata?: any;
}) => {
  const response = await fetch(`${API_BASE_URL}/websocket/sessions/start`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

export const endWebSocketSession = async (sessionId: string) => {
  const response = await fetch(`${API_BASE_URL}/websocket/sessions/end`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ session_id: sessionId }),
  });
  return handleResponse(response);
};

// Workflow Operations
export const cloneWorkflow = async (workflowId: string) => {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/clone`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });
  return handleResponse(response);
};

export const archiveWorkflow = async (workflowId: string) => {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/archive`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });
  return handleResponse(response);
};

export const createTemplateFromWorkflow = async (workflowId: string) => {
  const response = await fetch(`${API_BASE_URL}/workflows/${workflowId}/template`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });
  return handleResponse(response);
};

// Metrics
export const getUserUsageMetrics = async (startDate: string, endDate: string) => {
  const response = await fetch(
    `${API_BASE_URL}/metrics/usage?start_date=${startDate}&end_date=${endDate}`,
    {
      headers: await getAuthHeaders(),
    }
  );
  return handleResponse(response);
};

export const getCredentialsForWorkflow = async (workflowId: string) => {
  const response = await fetch(
    `${API_BASE_URL}/metrics/workflow/${workflowId}/credentials`,
    {
      headers: await getAuthHeaders(),
    }
  );
  return handleResponse(response);
}; 