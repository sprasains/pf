import { PrismaClient } from '@prisma/client';
import { WorkflowExecutionService } from '../workflowExecution';
import { n8nClient } from '../../utils/n8n';
import { AppError } from '../../utils/error';

jest.mock('@prisma/client');
jest.mock('../../utils/n8n');

describe('WorkflowExecutionService', () => {
  let service: WorkflowExecutionService;
  let prisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    prisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new WorkflowExecutionService(prisma);
  });

  describe('startWorkflow', () => {
    it('should start a workflow successfully', async () => {
      const mockInstance = {
        id: '1',
        isActive: false,
        template: {
          id: 'template1',
          sourceType: 'prebuilt'
        }
      };

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);
      prisma.workflowInstance.update.mockResolvedValue({ ...mockInstance, isActive: true } as any);
      (n8nClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await service.startWorkflow('1');

      expect(prisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { template: true }
      });
      expect(n8nClient.post).toHaveBeenCalledWith('/workflows/start', {
        workflowId: '1',
        config: mockInstance.config
      });
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: true }
      });
    });

    it('should throw error if workflow not found', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.startWorkflow('1')).rejects.toThrow(AppError);
    });

    it('should throw error if workflow is already running', async () => {
      const mockInstance = {
        id: '1',
        isActive: true
      };

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);

      await expect(service.startWorkflow('1')).rejects.toThrow(AppError);
    });
  });

  describe('stopWorkflow', () => {
    it('should stop a workflow successfully', async () => {
      const mockInstance = {
        id: '1',
        isActive: true
      };

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);
      prisma.workflowInstance.update.mockResolvedValue({ ...mockInstance, isActive: false } as any);
      (n8nClient.post as jest.Mock).mockResolvedValue({ data: {} });

      await service.stopWorkflow('1');

      expect(prisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(n8nClient.post).toHaveBeenCalledWith('/workflows/stop', {
        workflowId: '1'
      });
      expect(prisma.workflowInstance.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { isActive: false }
      });
    });

    it('should throw error if workflow not found', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.stopWorkflow('1')).rejects.toThrow(AppError);
    });

    it('should throw error if workflow is not running', async () => {
      const mockInstance = {
        id: '1',
        isActive: false
      };

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);

      await expect(service.stopWorkflow('1')).rejects.toThrow(AppError);
    });
  });

  describe('getWorkflowStatus', () => {
    it('should get workflow status successfully', async () => {
      const mockInstance = {
        id: '1',
        isActive: true
      };

      const mockStatus = {
        lastRun: new Date(),
        nextRun: new Date()
      };

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);
      (n8nClient.get as jest.Mock).mockResolvedValue({ data: mockStatus });

      const result = await service.getWorkflowStatus('1');

      expect(prisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(n8nClient.get).toHaveBeenCalledWith('/workflows/1/status');
      expect(result).toEqual({
        isActive: true,
        lastRun: mockStatus.lastRun,
        nextRun: mockStatus.nextRun
      });
    });

    it('should throw error if workflow not found', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.getWorkflowStatus('1')).rejects.toThrow(AppError);
    });
  });

  describe('getWorkflowLogs', () => {
    it('should get workflow logs successfully', async () => {
      const mockInstance = {
        id: '1'
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

      prisma.workflowInstance.findUnique.mockResolvedValue(mockInstance as any);
      (n8nClient.get as jest.Mock).mockResolvedValue({ data: mockLogs });

      const result = await service.getWorkflowLogs('1');

      expect(prisma.workflowInstance.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(n8nClient.get).toHaveBeenCalledWith('/workflows/1/logs');
      expect(result).toEqual(mockLogs);
    });

    it('should throw error if workflow not found', async () => {
      prisma.workflowInstance.findUnique.mockResolvedValue(null);

      await expect(service.getWorkflowLogs('1')).rejects.toThrow(AppError);
    });
  });
}); 