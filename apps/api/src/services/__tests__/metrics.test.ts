import { PrismaClient } from '@prisma/client';
import { MetricsService } from '../metrics';
import { logger } from '../../utils/logger';

jest.mock('@prisma/client');
jest.mock('../../utils/logger');

describe('MetricsService', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    jest.clearAllMocks();
  });

  describe('incrementCounter', () => {
    it('should increment counter successfully', async () => {
      mockPrisma.$executeRaw.mockResolvedValueOnce(undefined);

      await MetricsService.incrementCounter('test_counter', 5);

      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(expect.any(Array));
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrisma.$executeRaw.mockRejectedValueOnce(error);

      await MetricsService.incrementCounter('test_counter');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to increment metric counter',
        expect.objectContaining({
          error,
          name: 'test_counter',
          value: 1
        })
      );
    });
  });

  describe('getCounter', () => {
    it('should return counter value', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ value: 42 }]);

      const result = await MetricsService.getCounter('test_counter');

      expect(result).toBe(42);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return 0 when counter not found', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await MetricsService.getCounter('test_counter');

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrisma.$queryRaw.mockRejectedValueOnce(error);

      const result = await MetricsService.getCounter('test_counter');

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get metric counter',
        expect.objectContaining({
          error,
          name: 'test_counter'
        })
      );
    });
  });

  describe('getAverageValue', () => {
    it('should return average value', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ avg: 25.5 }]);

      const result = await MetricsService.getAverageValue('test_counter');

      expect(result).toBe(25.5);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should return 0 when no data found', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([]);

      const result = await MetricsService.getAverageValue('test_counter');

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error');
      mockPrisma.$queryRaw.mockRejectedValueOnce(error);

      const result = await MetricsService.getAverageValue('test_counter');

      expect(result).toBe(0);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get metric average',
        expect.objectContaining({
          error,
          name: 'test_counter'
        })
      );
    });
  });
}); 