import crypto from 'crypto';
import { logger } from '../utils/logger';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-fallback-encryption-key';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

export class EncryptionService {
  private static getKey(salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, ITERATIONS, KEY_LENGTH, 'sha512');
  }

  static encrypt(data: any): string {
    try {
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      const key = this.getKey(salt);

      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      const jsonString = JSON.stringify(data);
      const encrypted = Buffer.concat([
        cipher.update(jsonString, 'utf8'),
        cipher.final()
      ]);

      const tag = cipher.getAuthTag();

      // Combine all components
      const result = Buffer.concat([
        salt,
        iv,
        tag,
        encrypted
      ]);

      return result.toString('base64');
    } catch (error) {
      logger.error('Failed to encrypt data', { error });
      throw new Error('Encryption failed');
    }
  }

  static decrypt(encryptedData: string): any {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');

      // Extract components
      const salt = buffer.subarray(0, SALT_LENGTH);
      const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
      const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

      const key = this.getKey(salt);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      logger.error('Failed to decrypt data', { error });
      throw new Error('Decryption failed');
    }
  }
} 