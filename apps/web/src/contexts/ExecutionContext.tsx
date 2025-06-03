import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api';

interface ExecutionState {
  id: string;
  state: {
    id: string;
    name: string;
  };
  timestamp: string;
}

interface Execution {
  id: string;
  workflow: {
    id: string;
    name: string;
  };
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  startedAt: string;
  endedAt?: string;
  duration?: number;
  states: ExecutionState[];
}

interface ExecutionContextType {
  currentExecution: Execution | null;
  isLoading: boolean;
  error: string | null;
  startExecution: (workflowId: string) => Promise<void>;
  completeExecution: (status: 'SUCCESS' | 'ERROR', error?: string) => Promise<void>;
  recordTransition: (toStateId: string, metadata?: any) => Promise<void>;
  fetchExecution: (id: string) => Promise<void>;
  clearExecution: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  const [currentExecution, setCurrentExecution] = useState<Execution | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startExecution = useCallback(async (workflowId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.post('/api/executions', { workflowId });
      await fetchExecution(data.executionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start execution');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeExecution = useCallback(async (status: 'SUCCESS' | 'ERROR', error?: string) => {
    if (!currentExecution) return;
    try {
      setIsLoading(true);
      setError(null);
      await api.post(`/api/executions/${currentExecution.id}/complete`, { status, error });
      await fetchExecution(currentExecution.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete execution');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentExecution]);

  const recordTransition = useCallback(async (toStateId: string, metadata?: any) => {
    if (!currentExecution) return;
    try {
      setIsLoading(true);
      setError(null);
      await api.post(`/api/executions/${currentExecution.id}/transition`, { toStateId, metadata });
      await fetchExecution(currentExecution.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record transition');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [currentExecution]);

  const fetchExecution = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get(`/api/executions/${id}`);
      setCurrentExecution(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch execution');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearExecution = useCallback(() => {
    setCurrentExecution(null);
    setError(null);
  }, []);

  const value = {
    currentExecution,
    isLoading,
    error,
    startExecution,
    completeExecution,
    recordTransition,
    fetchExecution,
    clearExecution
  };

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecution() {
  const context = useContext(ExecutionContext);
  if (context === undefined) {
    throw new Error('useExecution must be used within an ExecutionProvider');
  }
  return context;
} 