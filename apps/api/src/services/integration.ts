import { PrismaClient } from '@prisma/client';
import { EncryptionService } from './encryption';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

export interface IntegrationCredential {
  id: string;
  userId: string;
  orgId: string;
  provider: string;
  credentials: any;
  label: string;
  createdAt: Date;
  updatedAt: Date;
}

export class IntegrationService {
  private static prisma = new PrismaClient();

  static async createCredential(
    userId: string,
    orgId: string,
    provider: string,
    credentials: any,
    label: string
  ): Promise<IntegrationCredential> {
    try {
      const encryptedCredentials = EncryptionService.encrypt(credentials);

      const credential = await this.prisma.integrationCredential.create({
        data: {
          userId,
          orgId,
          provider,
          credentials: encryptedCredentials,
          label
        }
      });

      return {
        ...credential,
        credentials: credentials // Return decrypted credentials
      };
    } catch (error) {
      logger.error('Failed to create integration credential', {
        error,
        userId,
        orgId,
        provider
      });
      throw new AppError('Failed to create integration credential');
    }
  }

  static async getCredential(
    id: string,
    userId: string,
    orgId: string
  ): Promise<IntegrationCredential> {
    try {
      const credential = await this.prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId
        }
      });

      if (!credential) {
        throw new AppError('Credential not found');
      }

      return {
        ...credential,
        credentials: EncryptionService.decrypt(credential.credentials as string)
      };
    } catch (error) {
      logger.error('Failed to get integration credential', {
        error,
        id,
        userId,
        orgId
      });
      throw new AppError('Failed to get integration credential');
    }
  }

  static async listCredentials(
    userId: string,
    orgId: string,
    provider?: string
  ): Promise<IntegrationCredential[]> {
    try {
      const credentials = await this.prisma.integrationCredential.findMany({
        where: {
          userId,
          orgId,
          ...(provider && { provider })
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return credentials.map(credential => ({
        ...credential,
        credentials: EncryptionService.decrypt(credential.credentials as string)
      }));
    } catch (error) {
      logger.error('Failed to list integration credentials', {
        error,
        userId,
        orgId,
        provider
      });
      throw new AppError('Failed to list integration credentials');
    }
  }

  static async updateCredential(
    id: string,
    userId: string,
    orgId: string,
    updates: {
      credentials?: any;
      label?: string;
    }
  ): Promise<IntegrationCredential> {
    try {
      const credential = await this.prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId
        }
      });

      if (!credential) {
        throw new AppError('Credential not found');
      }

      const data: any = {};
      if (updates.credentials) {
        data.credentials = EncryptionService.encrypt(updates.credentials);
      }
      if (updates.label) {
        data.label = updates.label;
      }

      const updated = await this.prisma.integrationCredential.update({
        where: { id },
        data
      });

      return {
        ...updated,
        credentials: updates.credentials || EncryptionService.decrypt(updated.credentials as string)
      };
    } catch (error) {
      logger.error('Failed to update integration credential', {
        error,
        id,
        userId,
        orgId
      });
      throw new AppError('Failed to update integration credential');
    }
  }

  static async deleteCredential(
    id: string,
    userId: string,
    orgId: string
  ): Promise<void> {
    try {
      const credential = await this.prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId
        }
      });

      if (!credential) {
        throw new AppError('Credential not found');
      }

      await this.prisma.integrationCredential.delete({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to delete integration credential', {
        error,
        id,
        userId,
        orgId
      });
      throw new AppError('Failed to delete integration credential');
    }
  }
} 