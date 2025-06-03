import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkflowExecutionProvider, useWorkflowExecution } from '../WorkflowExecutionContext';
import { SnackbarProvider } from 'notistack';
import { api } from '../../utils/api';

jest.mock('../../utils/api');
jest.mock('notistack', () => ({
  useSnackbar: () => ({
    enqueueSnackbar: jest.fn()
  })
}));

const TestComponent = () => {
  const {
    status,
    logs,
    loading,
    error,
    startWorkflow,
    stopWorkflow,
    refreshStatus,
    refreshLogs
  } = useWorkflowExecution();

  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error}</div>
      <div data-testid="status">{JSON.stringify(status)}</div>
      <div data-testid="logs">{JSON.stringify(logs)}</div>
      <button onClick={() => startWorkflow('1')}>Start</button>
      <button onClick={() => stopWorkflow('1')}>Stop</button>
      <button onClick={() => refreshStatus('1')}>Refresh Status</button>
      <button onClick={() => refreshLogs('1')}>Refresh Logs</button>
    </div>
  );
};

describe('WorkflowExecutionProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide workflow execution context', async () => {
    const mockStatus = {
      isActive: true,
      lastRun: new Date(),
      nextRun: new Date()
    };

    const mockLogs = {
      logs: [
        {
          timestamp: new Date(),
          level: 'info',
          message: 'Test log'
        }
      ]
    };

    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    (api.get as jest.Mock)
      .mockImplementation((url) => {
        if (url.includes('status')) {
          return Promise.resolve({ data: mockStatus });
        }
        if (url.includes('logs')) {
          return Promise.resolve({ data: mockLogs });
        }
        return Promise.reject(new Error('Not found'));
      });

    render(
      <SnackbarProvider>
        <WorkflowExecutionProvider>
          <TestComponent />
        </WorkflowExecutionProvider>
      </SnackbarProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('');

    // Test start workflow
    fireEvent.click(screen.getByText('Start'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workflow/workflows/1/start');
    });

    // Test stop workflow
    fireEvent.click(screen.getByText('Stop'));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/workflow/workflows/1/stop');
    });

    // Test refresh status
    fireEvent.click(screen.getByText('Refresh Status'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/workflow/workflows/1/status');
      expect(screen.getByTestId('status')).toHaveTextContent(JSON.stringify({ '1': mockStatus }));
    });

    // Test refresh logs
    fireEvent.click(screen.getByText('Refresh Logs'));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/workflow/workflows/1/logs');
      expect(screen.getByTestId('logs')).toHaveTextContent(JSON.stringify({ '1': mockLogs.logs }));
    });
  });

  it('should handle errors', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Test error'));

    render(
      <SnackbarProvider>
        <WorkflowExecutionProvider>
          <TestComponent />
        </WorkflowExecutionProvider>
      </SnackbarProvider>
    );

    fireEvent.click(screen.getByText('Start'));
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to start workflow');
    });
  });
}); 