import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export class StorageService {
  static async backupAIResponse(promptId: string, data: any) {
    try {
      const key = `ai-responses/${promptId}.json`;
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BACKUP_BUCKET || 'pumpflix-backups',
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json'
      });

      await s3Client.send(command);
      logger.info('AI response backed up to S3', { promptId, key });
    } catch (error) {
      logger.error('Failed to backup AI response to S3', { error, promptId });
    }
  }
} 