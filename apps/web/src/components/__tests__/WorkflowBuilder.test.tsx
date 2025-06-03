import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WorkflowBuilder } from '../WorkflowBuilder';
import { WorkflowProvider, useWorkflow } from '../../contexts/WorkflowContext';
import { WorkflowExecutionProvider, useWorkflowExecution } from '../../contexts/WorkflowExecutionContext';
import { SnackbarProvider } from 'notistack';
import { api } from '../../utils/api';

jest.mock('../../contexts/WorkflowContext');
jest.mock('../../contexts/WorkflowExecutionContext');
jest.mock('../../utils/api');
jest.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: jest.fn()
  })
}));

const mockTemplates = [
  {
    id: '1',
    name: 'Template 1',
    description: 'Test template 1',
    sourceType: 'prebuilt',
    config: {}
  },
  {
    id: '2',
    name: 'Template 2',
    description: 'Test template 2',
    sourceType: 'ai',
    config: {}
  }
];

const mockInstances = [
  {
    id: '1',
    name: 'Instance 1',
    description: 'Test instance 1',
    templateId: '1',
    config: {},
    isActive: true
  },
  {
    id: '2',
    name: 'Instance 2',
    description: 'Test instance 2',
    templateId: '2',
    config: {},
    isActive: false
  }
];

const mockStatus = {
  '1': {
    isActive: true,
    lastRun: new Date(),
    nextRun: new Date()
  },
  '2': {
    isActive: false,
    lastRun: null,
    nextRun: null
  }
};

const mockLogs = {
  '1': [
    {
      timestamp: new Date(),
      level: 'info',
      message: 'Test log'
    }
  ]
};

describe('WorkflowBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useWorkflow as jest.Mock).mockReturnValue({
      templates: mockTemplates,
      instances: mockInstances,
      loading: false,
      error: null,
      createInstance: jest.fn().mockResolvedValue(mockInstances[0]),
      updateInstance: jest.fn().mockResolvedValue(mockInstances[0]),
      deleteInstance: jest.fn().mockResolvedValue(undefined)
    });

    (useWorkflowExecution as jest.Mock).mockReturnValue({
      status: mockStatus,
      logs: mockLogs,
      loading: false,
      startWorkflow: jest.fn().mockResolvedValue(undefined),
      stopWorkflow: jest.fn().mockResolvedValue(undefined),
      refreshStatus: jest.fn().mockResolvedValue(undefined),
      refreshLogs: jest.fn().mockResolvedValue(undefined)
    });
  });

  it('should render workflow builder', () => {
    render(
      <SnackbarProvider>
        <WorkflowProvider>
          <WorkflowExecutionProvider>
            <WorkflowBuilder />
          </WorkflowExecutionProvider>
        </WorkflowProvider>
      </SnackbarProvider>
    );

    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Instances')).toBeInTheDocument();
  });

  it('should handle template selection', async () => {
    render(
      <SnackbarProvider>
        <WorkflowProvider>
          <WorkflowExecutionProvider>
            <WorkflowBuilder />
          </WorkflowExecutionProvider>
        </WorkflowProvider>
      </SnackbarProvider>
    );

    const templateSelect = screen.getByRole('combobox', { name: /select a template/i });
    fireEvent.change(templateSelect, { target: { value: '1' } });

    expect(screen.getByText('Create Instance')).toBeInTheDocument();
  });

  it('should handle instance selection', async () => {
    render(
      <SnackbarProvider>
        <WorkflowProvider>
          <WorkflowExecutionProvider>
            <WorkflowBuilder />
          </WorkflowExecutionProvider>
        </WorkflowProvider>
      </SnackbarProvider>
    );

    const instanceSelect = screen.getByRole('combobox', { name: /select an instance/i });
    fireEvent.change(instanceSelect, { target: { value: '1' } });

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Test log')).toBeInTheDocument();
  });

  it('should handle workflow actions', async () => {
    render(
      <SnackbarProvider>
        <WorkflowProvider>
          <WorkflowExecutionProvider>
            <WorkflowBuilder />
          </WorkflowExecutionProvider>
        </WorkflowProvider>
      </SnackbarProvider>
    );

    const instanceSelect = screen.getByRole('combobox', { name: /select an instance/i });
    fireEvent.change(instanceSelect, { target: { value: '1' } });

    // Test start/stop
    const startStopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(startStopButton);
    await waitFor(() => {
      expect(useWorkflowExecution().stopWorkflow).toHaveBeenCalledWith('1');
    });

    // Test refresh
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    await waitFor(() => {
      expect(useWorkflowExecution().refreshStatus).toHaveBeenCalledWith('1');
    });

    // Test delete
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(useWorkflow().deleteInstance).toHaveBeenCalledWith('1');
    });
  });

  it('should handle create/edit workflow', async () => {
    render(
      <SnackbarProvider>
        <WorkflowProvider>
          <WorkflowExecutionProvider>
            <WorkflowBuilder />
          </WorkflowExecutionProvider>
        </WorkflowProvider>
      </SnackbarProvider>
    );

    // Test create
    const templateSelect = screen.getByRole('combobox', { name: /select a template/i });
    fireEvent.change(templateSelect, { target: { value: '1' } });

    const createButton = screen.getByText('Create Instance');
    fireEvent.click(createButton);

    const nameInput = screen.getByLabelText('Name');
    const descriptionInput = screen.getByLabelText('Description');

    fireEvent.change(nameInput, { target: { value: 'New Instance' } });
    fireEvent.change(descriptionInput, { target: { value: 'New Description' } });

    const submitButton = screen.getByRole('button', { name: /create/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(useWorkflow().createInstance).toHaveBeenCalledWith({
        name: 'New Instance',
        description: 'New Description',
        config: {},
        templateId: '1'
      });
    });

    // Test edit
    const instanceSelect = screen.getByRole('combobox', { name: /select an instance/i });
    fireEvent.change(instanceSelect, { target: { value: '1' } });

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    fireEvent.change(nameInput, { target: { value: 'Updated Instance' } });
    fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });

    const updateButton = screen.getByRole('button', { name: /update/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(useWorkflow().updateInstance).toHaveBeenCalledWith('1', {
        name: 'Updated Instance',
        description: 'Updated Description',
        config: {}
      });
    });
  });
}); 