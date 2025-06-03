import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIBuilder } from '../AIBuilder';
import axios from 'axios';
import { SnackbarProvider } from 'notistack';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: () => <div data-testid="monaco-editor" />
}));

jest.mock('../../components/AIMetrics', () => ({
  AIMetrics: () => <div data-testid="ai-metrics" />
}));

describe('AIBuilder', () => {
  const mockWorkflow = {
    name: 'Test Workflow',
    nodes: [],
    connections: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <SnackbarProvider>
        <AIBuilder />
      </SnackbarProvider>
    );
  };

  it('should render initial state', () => {
    renderComponent();

    expect(screen.getByText('AI Workflow Builder')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Example: Create a workflow/)).toBeInTheDocument();
    expect(screen.getByText('Generate Workflow')).toBeInTheDocument();
    expect(screen.getByTestId('ai-metrics')).toBeInTheDocument();
  });

  it('should handle workflow generation', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        workflow: mockWorkflow,
        promptId: 'prompt123'
      }
    });

    renderComponent();

    const input = screen.getByPlaceholderText(/Example: Create a workflow/);
    fireEvent.change(input, {
      target: { value: 'Create a workflow to fetch data from Google Sheets' }
    });

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      expect(screen.getByText('Save to Workflows')).toBeInTheDocument();
    });

    expect(mockedAxios.post).toHaveBeenCalledWith('/api/ai/generate', {
      prompt: 'Create a workflow to fetch data from Google Sheets'
    });
  });

  it('should handle generation error', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('Generation failed'));

    renderComponent();

    const input = screen.getByPlaceholderText(/Example: Create a workflow/);
    fireEvent.change(input, {
      target: { value: 'Create a workflow to fetch data from Google Sheets' }
    });

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });
  });

  it('should handle workflow saving', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          workflow: mockWorkflow,
          promptId: 'prompt123'
        }
      })
      .mockResolvedValueOnce({ data: { id: 'workflow123' } });

    renderComponent();

    const input = screen.getByPlaceholderText(/Example: Create a workflow/);
    fireEvent.change(input, {
      target: { value: 'Create a workflow to fetch data from Google Sheets' }
    });

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Save to Workflows')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save to Workflows');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/ai/generate-and-save', {
        prompt: 'Create a workflow to fetch data from Google Sheets'
      });
    });
  });

  it('should handle save error', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({
        data: {
          workflow: mockWorkflow,
          promptId: 'prompt123'
        }
      })
      .mockRejectedValueOnce(new Error('Save failed'));

    renderComponent();

    const input = screen.getByPlaceholderText(/Example: Create a workflow/);
    fireEvent.change(input, {
      target: { value: 'Create a workflow to fetch data from Google Sheets' }
    });

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Save to Workflows')).toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save to Workflows');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save workflow')).toBeInTheDocument();
    });
  });

  it('should validate empty prompt', () => {
    renderComponent();

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    expect(screen.getByText('Please enter a prompt')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it('should disable buttons during loading', async () => {
    mockedAxios.post.mockImplementation(() => new Promise(() => {}));

    renderComponent();

    const input = screen.getByPlaceholderText(/Example: Create a workflow/);
    fireEvent.change(input, {
      target: { value: 'Create a workflow to fetch data from Google Sheets' }
    });

    const generateButton = screen.getByText('Generate Workflow');
    fireEvent.click(generateButton);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(generateButton).toBeDisabled();
    expect(input).toBeDisabled();
  });
}); 