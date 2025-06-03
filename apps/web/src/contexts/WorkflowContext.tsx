import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSnackbar } from 'notistack';
import { api } from '../utils/api';
import {
  WorkflowTemplate,
  WorkflowInstance,
  CreateWorkflowTemplate,
  CreateWorkflowInstance,
  UpdateWorkflowTemplate,
  UpdateWorkflowInstance
} from '@pumpflix/shared';

interface WorkflowContextType {
  templates: WorkflowTemplate[];
  instances: WorkflowInstance[];
  loading: boolean;
  error: string | null;
  createTemplate: (data: CreateWorkflowTemplate) => Promise<void>;
  createInstance: (data: CreateWorkflowInstance) => Promise<void>;
  updateTemplate: (id: string, data: UpdateWorkflowTemplate) => Promise<void>;
  updateInstance: (id: string, data: UpdateWorkflowInstance) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  refreshTemplates: () => Promise<void>;
  refreshInstances: () => Promise<void>;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const refreshTemplates = async () => {
    try {
      const response = await api.get('/workflow/templates');
      setTemplates(response.data);
    } catch (err) {
      setError('Failed to fetch templates');
      enqueueSnackbar('Failed to fetch templates', { variant: 'error' });
    }
  };

  const refreshInstances = async () => {
    try {
      const response = await api.get('/workflow/instances');
      setInstances(response.data);
    } catch (err) {
      setError('Failed to fetch instances');
      enqueueSnackbar('Failed to fetch instances', { variant: 'error' });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([refreshTemplates(), refreshInstances()]);
      } catch (err) {
        setError('Failed to load workflow data');
        enqueueSnackbar('Failed to load workflow data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const createTemplate = async (data: CreateWorkflowTemplate) => {
    try {
      const response = await api.post('/workflow/templates', data);
      setTemplates([...templates, response.data]);
      enqueueSnackbar('Template created successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to create template');
      enqueueSnackbar('Failed to create template', { variant: 'error' });
      throw err;
    }
  };

  const createInstance = async (data: CreateWorkflowInstance) => {
    try {
      const response = await api.post('/workflow/instances', data);
      setInstances([...instances, response.data]);
      enqueueSnackbar('Instance created successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to create instance');
      enqueueSnackbar('Failed to create instance', { variant: 'error' });
      throw err;
    }
  };

  const updateTemplate = async (id: string, data: UpdateWorkflowTemplate) => {
    try {
      const response = await api.patch(`/workflow/templates/${id}`, data);
      setTemplates(templates.map(t => (t.id === id ? response.data : t)));
      enqueueSnackbar('Template updated successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to update template');
      enqueueSnackbar('Failed to update template', { variant: 'error' });
      throw err;
    }
  };

  const updateInstance = async (id: string, data: UpdateWorkflowInstance) => {
    try {
      const response = await api.patch(`/workflow/instances/${id}`, data);
      setInstances(instances.map(i => (i.id === id ? response.data : i)));
      enqueueSnackbar('Instance updated successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to update instance');
      enqueueSnackbar('Failed to update instance', { variant: 'error' });
      throw err;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      await api.delete(`/workflow/templates/${id}`);
      setTemplates(templates.filter(t => t.id !== id));
      enqueueSnackbar('Template deleted successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to delete template');
      enqueueSnackbar('Failed to delete template', { variant: 'error' });
      throw err;
    }
  };

  const deleteInstance = async (id: string) => {
    try {
      await api.delete(`/workflow/instances/${id}`);
      setInstances(instances.filter(i => i.id !== id));
      enqueueSnackbar('Instance deleted successfully', { variant: 'success' });
    } catch (err) {
      setError('Failed to delete instance');
      enqueueSnackbar('Failed to delete instance', { variant: 'error' });
      throw err;
    }
  };

  const value = {
    templates,
    instances,
    loading,
    error,
    createTemplate,
    createInstance,
    updateTemplate,
    updateInstance,
    deleteTemplate,
    deleteInstance,
    refreshTemplates,
    refreshInstances
  };

  return (
    <WorkflowContext.Provider value={value}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (context === undefined) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
} 