import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { api } from '../utils/api';

interface WorkflowStatus {
  isActive: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
}

interface WorkflowLog {
  timestamp: Date;
  level: string;
  message: string;
}

interface WorkflowExecutionContextType {
  status: Record<string, WorkflowStatus>;
  logs: Record<string, WorkflowLog[]>;
  loading: boolean;
  error: string | null;
  startWorkflow: (instanceId: string) => Promise<void>;
  stopWorkflow: (instanceId: string) => Promise<void>;
  refreshStatus: (instanceId: string) => Promise<void>;
  refreshLogs: (instanceId: string) => Promise<void>;
}

const WorkflowExecutionContext = createContext<WorkflowExecutionContextType | undefined>(undefined);

export function WorkflowExecutionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Record<string, WorkflowStatus>>({});
  const [logs, setLogs] = useState<Record<string, WorkflowLog[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const startWorkflow = async (instanceId: string) => {
    try {
      setLoading(true);
      await api.post(`/workflow/workflows/${instanceId}/start`);
      await refreshStatus(instanceId);
      enqueueSnackbar('Workflow started successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to start workflow');
      enqueueSnackbar('Failed to start workflow', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopWorkflow = async (instanceId: string) => {
    try {
      setLoading(true);
      await api.post(`/workflow/workflows/${instanceId}/stop`);
      await refreshStatus(instanceId);
      enqueueSnackbar('Workflow stopped successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to stop workflow');
      enqueueSnackbar('Failed to stop workflow', { variant: 'error' });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async (instanceId: string) => {
    try {
      const response = await api.get(`/workflow/workflows/${instanceId}/status`);
      setStatus(prev => ({
        ...prev,
        [instanceId]: response.data
      }));
    } catch (err) {
      setError('Failed to fetch workflow status');
      enqueueSnackbar('Failed to fetch workflow status', { variant: 'error' });
      throw err;
    }
  };

  const refreshLogs = async (instanceId: string) => {
    try {
      const response = await api.get(`/workflow/workflows/${instanceId}/logs`);
      setLogs(prev => ({
        ...prev,
        [instanceId]: response.data.logs
      }));
    } catch (err) {
      setError('Failed to fetch workflow logs');
      enqueueSnackbar('Failed to fetch workflow logs', { variant: 'error' });
      throw err;
    }
  };

  const value = {
    status,
    logs,
    loading,
    error,
    startWorkflow,
    stopWorkflow,
    refreshStatus,
    refreshLogs
  };

  return (
    <WorkflowExecutionContext.Provider value={value}>
      {children}
    </WorkflowExecutionContext.Provider>
  );
}

export function useWorkflowExecution() {
  const context = useContext(WorkflowExecutionContext);
  if (context === undefined) {
    throw new Error('useWorkflowExecution must be used within a WorkflowExecutionProvider');
  }
  return context;
} 