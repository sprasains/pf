import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AIMetrics } from '../AIMetrics';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AIMetrics', () => {
  const mockMetrics = {
    totalPrompts: 100,
    failedCalls: 5,
    successRate: 0.95,
    avgTokens: 150
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    mockedAxios.get.mockImplementation(() => new Promise(() => {}));
    render(<AIMetrics />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should render metrics successfully', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: mockMetrics });
    render(<AIMetrics />);

    await waitFor(() => {
      expect(screen.getByText('Total Prompts')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Failed Calls')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('95.0%')).toBeInTheDocument();
      expect(screen.getByText('Avg. Tokens')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<AIMetrics />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
    });
  });

  it('should refresh metrics every minute', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({ data: mockMetrics })
      .mockResolvedValueOnce({ data: { ...mockMetrics, totalPrompts: 101 } });

    render(<AIMetrics />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(60000);

    await waitFor(() => {
      expect(screen.getByText('101')).toBeInTheDocument();
    });

    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  it('should clean up interval on unmount', () => {
    const { unmount } = render(<AIMetrics />);
    unmount();
    jest.advanceTimersByTime(60000);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });
}); 