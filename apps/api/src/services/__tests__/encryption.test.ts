import { EncryptionService } from '../encryption';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');

describe('EncryptionService', () => {
  const testData = {
    apiKey: 'test-key',
    secret: 'test-secret',
    config: {
      enabled: true,
      timeout: 5000
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('encrypt', () => {
    it('should encrypt data successfully', () => {
      const encrypted = EncryptionService.encrypt(testData);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toContain(testData.apiKey);
      expect(encrypted).not.toContain(testData.secret);
    });

    it('should handle encryption errors', () => {
      const error = new Error('Encryption failed');
      jest.spyOn(global, 'Buffer').mockImplementationOnce(() => {
        throw error;
      });

      expect(() => EncryptionService.encrypt(testData)).toThrow('Encryption failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to encrypt data',
        expect.objectContaining({ error })
      );
    });
  });

  describe('decrypt', () => {
    it('should decrypt data successfully', () => {
      const encrypted = EncryptionService.encrypt(testData);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(testData);
    });

    it('should handle decryption errors', () => {
      const error = new Error('Decryption failed');
      jest.spyOn(global, 'Buffer').mockImplementationOnce(() => {
        throw error;
      });

      expect(() => EncryptionService.decrypt('invalid-data')).toThrow('Decryption failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to decrypt data',
        expect.objectContaining({ error })
      );
    });

    it('should handle invalid encrypted data', () => {
      expect(() => EncryptionService.decrypt('invalid-data')).toThrow('Decryption failed');
    });
  });

  describe('encrypt and decrypt', () => {
    it('should maintain data integrity through encryption and decryption', () => {
      const testCases = [
        { apiKey: 'key1', secret: 'secret1' },
        { config: { timeout: 1000, retries: 3 } },
        { nested: { data: { value: 42 } } },
        { array: [1, 2, 3, 4, 5] },
        { special: { chars: '!@#$%^&*()' } }
      ];

      testCases.forEach(testCase => {
        const encrypted = EncryptionService.encrypt(testCase);
        const decrypted = EncryptionService.decrypt(encrypted);
        expect(decrypted).toEqual(testCase);
      });
    });

    it('should handle large data objects', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: {
            value: Math.random(),
            timestamp: new Date().toISOString()
          }
        }))
      };

      const encrypted = EncryptionService.encrypt(largeData);
      const decrypted = EncryptionService.decrypt(encrypted);

      expect(decrypted).toEqual(largeData);
    });
  });
}); 