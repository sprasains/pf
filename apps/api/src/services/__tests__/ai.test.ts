import { OpenAI } from 'openai';
import { PrismaClient } from '@prisma/client';
import { AIService } from '../ai';
import { MetricsService } from '../metrics';
import { StorageService } from '../storage';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error';

jest.mock('openai');
jest.mock('@prisma/client');
jest.mock('../metrics');
jest.mock('../storage');
jest.mock('../../utils/logger');

describe('AIService', () => {
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockOpenAI = new OpenAI() as jest.Mocked<OpenAI>;
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    jest.clearAllMocks();
  });

  describe('generateWorkflow', () => {
    const mockPrompt = 'Create a workflow to fetch data from Google Sheets';
    const mockUserId = 'user123';
    const mockOrgId = 'org123';
    const mockWorkflow = {
      name: 'Test Workflow',
      nodes: [],
      connections: []
    };

    it('should generate workflow successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockWorkflow)
            }
          }
        ],
        usage: {
          total_tokens: 100
        }
      } as any);

      mockPrisma.aIWorkflowPrompt.create.mockResolvedValueOnce({
        id: 'prompt123',
        userId: mockUserId,
        orgId: mockOrgId,
        promptText: mockPrompt,
        responseJson: mockWorkflow,
        model: 'gpt-4',
        tokenUsage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await AIService.generateWorkflow(mockPrompt, mockUserId, mockOrgId);

      expect(result).toMatchObject({
        workflow: mockWorkflow,
        promptId: 'prompt123'
      });
      expect(MetricsService.incrementCounter).toHaveBeenCalledWith('total_ai_prompts');
      expect(MetricsService.incrementCounter).toHaveBeenCalledWith('total_tokens', 100);
      expect(StorageService.backupAIResponse).toHaveBeenCalled();
    });

    it('should handle AI generation errors', async () => {
      const error = new Error('AI generation failed');
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(error);

      await expect(
        AIService.generateWorkflow(mockPrompt, mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);

      expect(MetricsService.incrementCounter).toHaveBeenCalledWith('failed_ai_calls');
      expect(logger.error).toHaveBeenCalledWith(
        'AI workflow generation failed',
        expect.objectContaining({
          error,
          userId: mockUserId,
          orgId: mockOrgId,
          prompt: mockPrompt
        })
      );
    });

    it('should handle invalid workflow structure', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'invalid json'
            }
          }
        ]
      } as any);

      await expect(
        AIService.generateWorkflow(mockPrompt, mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);

      expect(MetricsService.incrementCounter).toHaveBeenCalledWith('failed_ai_calls');
    });
  });

  describe('generateAndSaveWorkflow', () => {
    const mockPrompt = 'Create a workflow to fetch data from Google Sheets';
    const mockUserId = 'user123';
    const mockOrgId = 'org123';
    const mockWorkflow = {
      name: 'Test Workflow',
      nodes: [],
      connections: []
    };

    it('should generate and save workflow successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockWorkflow)
            }
          }
        ],
        usage: {
          total_tokens: 100
        }
      } as any);

      mockPrisma.aIWorkflowPrompt.create.mockResolvedValueOnce({
        id: 'prompt123',
        userId: mockUserId,
        orgId: mockOrgId,
        promptText: mockPrompt,
        responseJson: mockWorkflow,
        model: 'gpt-4',
        tokenUsage: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockPrisma.workflowDefinition.create.mockResolvedValueOnce({
        id: 'workflow123',
        name: mockWorkflow.name,
        definition: mockWorkflow,
        sourceType: 'AI',
        aiPromptId: 'prompt123',
        userId: mockUserId,
        orgId: mockOrgId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await AIService.generateAndSaveWorkflow(mockPrompt, mockUserId, mockOrgId);

      expect(result).toMatchObject({
        id: 'workflow123',
        name: mockWorkflow.name,
        sourceType: 'AI',
        aiPromptId: 'prompt123'
      });
    });

    it('should handle save errors', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify(mockWorkflow)
            }
          }
        ]
      } as any);

      mockPrisma.aIWorkflowPrompt.create.mockResolvedValueOnce({
        id: 'prompt123',
        userId: mockUserId,
        orgId: mockOrgId,
        promptText: mockPrompt,
        responseJson: mockWorkflow,
        model: 'gpt-4',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const error = new Error('Database error');
      mockPrisma.workflowDefinition.create.mockRejectedValueOnce(error);

      await expect(
        AIService.generateAndSaveWorkflow(mockPrompt, mockUserId, mockOrgId)
      ).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate and save workflow',
        expect.objectContaining({
          error,
          userId: mockUserId,
          orgId: mockOrgId,
          prompt: mockPrompt
        })
      );
    });
  });

  describe('listPrompts', () => {
    const mockUserId = 'user123';
    const mockOrgId = 'org123';

    it('should list prompts successfully', async () => {
      const mockPrompts = [
        {
          id: 'prompt1',
          userId: mockUserId,
          orgId: mockOrgId,
          promptText: 'Test prompt 1',
          responseJson: {},
          model: 'gpt-4',
          createdAt: new Date(),
          updatedAt: new Date(),
          workflows: []
        }
      ];

      mockPrisma.aIWorkflowPrompt.findMany.mockResolvedValueOnce(mockPrompts);
      mockPrisma.aIWorkflowPrompt.count.mockResolvedValueOnce(1);

      const result = await AIService.listPrompts(mockUserId, mockOrgId);

      expect(result).toMatchObject({
        prompts: mockPrompts,
        pagination: {
          total: 1,
          page: 1,
          limit: 10,
          pages: 1
        }
      });
    });

    it('should handle list errors', async () => {
      const error = new Error('Database error');
      mockPrisma.aIWorkflowPrompt.findMany.mockRejectedValueOnce(error);

      await expect(
        AIService.listPrompts(mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to list AI prompts',
        expect.objectContaining({
          error,
          userId: mockUserId,
          orgId: mockOrgId
        })
      );
    });
  });

  describe('getPrompt', () => {
    const mockUserId = 'user123';
    const mockOrgId = 'org123';
    const mockPromptId = 'prompt123';

    it('should get prompt successfully', async () => {
      const mockPrompt = {
        id: mockPromptId,
        userId: mockUserId,
        orgId: mockOrgId,
        promptText: 'Test prompt',
        responseJson: {},
        model: 'gpt-4',
        createdAt: new Date(),
        updatedAt: new Date(),
        workflows: []
      };

      mockPrisma.aIWorkflowPrompt.findFirst.mockResolvedValueOnce(mockPrompt);

      const result = await AIService.getPrompt(mockPromptId, mockUserId, mockOrgId);

      expect(result).toEqual(mockPrompt);
    });

    it('should handle not found prompt', async () => {
      mockPrisma.aIWorkflowPrompt.findFirst.mockResolvedValueOnce(null);

      await expect(
        AIService.getPrompt(mockPromptId, mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);
    });

    it('should handle get errors', async () => {
      const error = new Error('Database error');
      mockPrisma.aIWorkflowPrompt.findFirst.mockRejectedValueOnce(error);

      await expect(
        AIService.getPrompt(mockPromptId, mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to get AI prompt',
        expect.objectContaining({
          error,
          id: mockPromptId,
          userId: mockUserId,
          orgId: mockOrgId
        })
      );
    });
  });
}); 