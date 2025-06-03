import { PrismaClient, IntegrationProvider } from '@prisma/client';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '../utils/logger';
import { AppError } from '../utils/error';

const prisma = new PrismaClient();

// Encryption configuration
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}

interface EncryptedData {
  iv: string;
  authTag: string;
  encryptedData: string;
}

interface CredentialInput {
  userId: string;
  orgId: string;
  provider: IntegrationProvider;
  credentials: Record<string, any>;
  label: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export class CredentialService {
  private static encrypt(data: any): EncryptedData {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY!, 'hex'),
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedData: encrypted.toString('hex')
    };
  }

  private static decrypt(encrypted: EncryptedData): any {
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(ENCRYPTION_KEY!, 'hex'),
      Buffer.from(encrypted.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted.encryptedData, 'hex')),
      decipher.final()
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  static async createCredential(input: CredentialInput) {
    try {
      const encrypted = this.encrypt(input.credentials);

      const credential = await prisma.integrationCredential.create({
        data: {
          userId: input.userId,
          orgId: input.orgId,
          provider: input.provider,
          credentials: encrypted,
          label: input.label,
          metadata: input.metadata,
          expiresAt: input.expiresAt
        }
      });

      logger.info('Credential created', {
        credentialId: credential.id,
        provider: input.provider,
        userId: input.userId,
        orgId: input.orgId
      });

      return credential;
    } catch (error) {
      logger.error('Failed to create credential', { error });
      throw new AppError('Failed to create credential', 500);
    }
  }

  static async getCredential(id: string, userId: string, orgId: string) {
    try {
      const credential = await prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId,
          isActive: true
        }
      });

      if (!credential) {
        throw new AppError('Credential not found', 404);
      }

      // Update last used timestamp
      await prisma.integrationCredential.update({
        where: { id },
        data: { lastUsedAt: new Date() }
      });

      const decrypted = this.decrypt(credential.credentials as EncryptedData);

      return {
        ...credential,
        credentials: decrypted
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to get credential', { error });
      throw new AppError('Failed to get credential', 500);
    }
  }

  static async listCredentials(userId: string, orgId: string, provider?: IntegrationProvider) {
    try {
      const credentials = await prisma.integrationCredential.findMany({
        where: {
          userId,
          orgId,
          isActive: true,
          ...(provider && { provider })
        },
        select: {
          id: true,
          provider: true,
          label: true,
          lastUsedAt: true,
          expiresAt: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return credentials;
    } catch (error) {
      logger.error('Failed to list credentials', { error });
      throw new AppError('Failed to list credentials', 500);
    }
  }

  static async updateCredential(
    id: string,
    userId: string,
    orgId: string,
    updates: Partial<CredentialInput>
  ) {
    try {
      const credential = await prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId,
          isActive: true
        }
      });

      if (!credential) {
        throw new AppError('Credential not found', 404);
      }

      const updateData: any = { ...updates };

      if (updates.credentials) {
        updateData.credentials = this.encrypt(updates.credentials);
      }

      const updated = await prisma.integrationCredential.update({
        where: { id },
        data: updateData
      });

      logger.info('Credential updated', {
        credentialId: id,
        userId,
        orgId
      });

      return updated;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to update credential', { error });
      throw new AppError('Failed to update credential', 500);
    }
  }

  static async deleteCredential(id: string, userId: string, orgId: string) {
    try {
      const credential = await prisma.integrationCredential.findFirst({
        where: {
          id,
          userId,
          orgId
        }
      });

      if (!credential) {
        throw new AppError('Credential not found', 404);
      }

      // Soft delete by setting isActive to false
      await prisma.integrationCredential.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info('Credential deleted', {
        credentialId: id,
        userId,
        orgId
      });

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to delete credential', { error });
      throw new AppError('Failed to delete credential', 500);
    }
  }

  static async validateCredential(id: string, userId: string, orgId: string) {
    try {
      const credential = await this.getCredential(id, userId, orgId);

      if (credential.expiresAt && credential.expiresAt < new Date()) {
        throw new AppError('Credential has expired', 400);
      }

      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Failed to validate credential', { error });
      throw new AppError('Failed to validate credential', 500);
    }
  }
} 