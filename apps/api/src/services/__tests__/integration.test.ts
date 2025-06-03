import { PrismaClient } from '@prisma/client';
import { IntegrationService } from '../integration';
import { EncryptionService } from '../encryption';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/error';

jest.mock('@prisma/client');
jest.mock('../encryption');
jest.mock('../../utils/logger');

describe('IntegrationService', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  const mockUserId = 'user123';
  const mockOrgId = 'org123';
  const mockProvider = 'google';
  const mockCredentials = { apiKey: 'test-key' };
  const mockLabel = 'Test Integration';

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    jest.clearAllMocks();
  });

  describe('createCredential', () => {
    it('should create credential successfully', async () => {
      const mockEncrypted = 'encrypted-data';
      (EncryptionService.encrypt as jest.Mock).mockReturnValue(mockEncrypted);

      const mockCredential = {
        id: 'cred123',
        userId: mockUserId,
        orgId: mockOrgId,
        provider: mockProvider,
        credentials: mockEncrypted,
        label: mockLabel,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.integrationCredential.create.mockResolvedValueOnce(mockCredential);

      const result = await IntegrationService.createCredential(
        mockUserId,
        mockOrgId,
        mockProvider,
        mockCredentials,
        mockLabel
      );

      expect(result).toEqual({
        ...mockCredential,
        credentials: mockCredentials
      });
      expect(EncryptionService.encrypt).toHaveBeenCalledWith(mockCredentials);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Database error');
      mockPrisma.integrationCredential.create.mockRejectedValueOnce(error);

      await expect(
        IntegrationService.createCredential(
          mockUserId,
          mockOrgId,
          mockProvider,
          mockCredentials,
          mockLabel
        )
      ).rejects.toThrow(AppError);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create integration credential',
        expect.objectContaining({
          error,
          userId: mockUserId,
          orgId: mockOrgId,
          provider: mockProvider
        })
      );
    });
  });

  describe('getCredential', () => {
    it('should get credential successfully', async () => {
      const mockEncrypted = 'encrypted-data';
      const mockCredential = {
        id: 'cred123',
        userId: mockUserId,
        orgId: mockOrgId,
        provider: mockProvider,
        credentials: mockEncrypted,
        label: mockLabel,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(mockCredential);
      (EncryptionService.decrypt as jest.Mock).mockReturnValue(mockCredentials);

      const result = await IntegrationService.getCredential(
        'cred123',
        mockUserId,
        mockOrgId
      );

      expect(result).toEqual({
        ...mockCredential,
        credentials: mockCredentials
      });
      expect(EncryptionService.decrypt).toHaveBeenCalledWith(mockEncrypted);
    });

    it('should handle not found credential', async () => {
      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(null);

      await expect(
        IntegrationService.getCredential('cred123', mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);
    });
  });

  describe('listCredentials', () => {
    it('should list credentials successfully', async () => {
      const mockEncrypted = 'encrypted-data';
      const mockCredentials = [
        {
          id: 'cred123',
          userId: mockUserId,
          orgId: mockOrgId,
          provider: mockProvider,
          credentials: mockEncrypted,
          label: mockLabel,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.integrationCredential.findMany.mockResolvedValueOnce(mockCredentials);
      (EncryptionService.decrypt as jest.Mock).mockReturnValue({ apiKey: 'test-key' });

      const result = await IntegrationService.listCredentials(mockUserId, mockOrgId);

      expect(result).toHaveLength(1);
      expect(result[0].credentials).toEqual({ apiKey: 'test-key' });
    });

    it('should filter by provider', async () => {
      await IntegrationService.listCredentials(mockUserId, mockOrgId, mockProvider);

      expect(mockPrisma.integrationCredential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
            orgId: mockOrgId,
            provider: mockProvider
          }
        })
      );
    });
  });

  describe('updateCredential', () => {
    it('should update credential successfully', async () => {
      const mockEncrypted = 'encrypted-data';
      const mockCredential = {
        id: 'cred123',
        userId: mockUserId,
        orgId: mockOrgId,
        provider: mockProvider,
        credentials: mockEncrypted,
        label: mockLabel,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(mockCredential);
      mockPrisma.integrationCredential.update.mockResolvedValueOnce(mockCredential);
      (EncryptionService.encrypt as jest.Mock).mockReturnValue(mockEncrypted);
      (EncryptionService.decrypt as jest.Mock).mockReturnValue(mockCredentials);

      const updates = {
        credentials: { apiKey: 'new-key' },
        label: 'New Label'
      };

      const result = await IntegrationService.updateCredential(
        'cred123',
        mockUserId,
        mockOrgId,
        updates
      );

      expect(result).toEqual({
        ...mockCredential,
        credentials: updates.credentials
      });
    });

    it('should handle not found credential', async () => {
      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(null);

      await expect(
        IntegrationService.updateCredential(
          'cred123',
          mockUserId,
          mockOrgId,
          { label: 'New Label' }
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe('deleteCredential', () => {
    it('should delete credential successfully', async () => {
      const mockCredential = {
        id: 'cred123',
        userId: mockUserId,
        orgId: mockOrgId,
        provider: mockProvider,
        credentials: 'encrypted-data',
        label: mockLabel,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(mockCredential);
      mockPrisma.integrationCredential.delete.mockResolvedValueOnce(mockCredential);

      await IntegrationService.deleteCredential('cred123', mockUserId, mockOrgId);

      expect(mockPrisma.integrationCredential.delete).toHaveBeenCalledWith({
        where: { id: 'cred123' }
      });
    });

    it('should handle not found credential', async () => {
      mockPrisma.integrationCredential.findFirst.mockResolvedValueOnce(null);

      await expect(
        IntegrationService.deleteCredential('cred123', mockUserId, mockOrgId)
      ).rejects.toThrow(AppError);
    });
  });
}); 