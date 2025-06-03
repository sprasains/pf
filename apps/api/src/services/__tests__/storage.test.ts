import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../storage';
import { logger } from '../../utils/logger';

jest.mock('@aws-sdk/client-s3');
jest.mock('../../utils/logger');

describe('StorageService', () => {
  let mockS3Client: jest.Mocked<S3Client>;

  beforeEach(() => {
    mockS3Client = new S3Client({}) as jest.Mocked<S3Client>;
    jest.clearAllMocks();
  });

  describe('backupAIResponse', () => {
    const mockData = {
      prompt: 'test prompt',
      response: { test: 'data' },
      metadata: {
        userId: 'user123',
        orgId: 'org123'
      }
    };

    it('should backup AI response successfully', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await StorageService.backupAIResponse('prompt123', mockData);

      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.any(PutObjectCommand)
      );
      expect(logger.info).toHaveBeenCalledWith(
        'AI response backed up to S3',
        expect.objectContaining({
          promptId: 'prompt123',
          key: expect.any(String)
        })
      );
    });

    it('should handle backup errors gracefully', async () => {
      const error = new Error('S3 error');
      mockS3Client.send.mockRejectedValueOnce(error);

      await StorageService.backupAIResponse('prompt123', mockData);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to backup AI response to S3',
        expect.objectContaining({
          error,
          promptId: 'prompt123'
        })
      );
    });

    it('should use correct S3 configuration', async () => {
      mockS3Client.send.mockResolvedValueOnce({});

      await StorageService.backupAIResponse('prompt123', mockData);

      const command = mockS3Client.send.mock.calls[0][0] as PutObjectCommand;
      expect(command.input).toMatchObject({
        Bucket: expect.any(String),
        Key: expect.stringContaining('ai-responses/prompt123.json'),
        ContentType: 'application/json',
        Body: expect.any(String)
      });
    });
  });
}); 