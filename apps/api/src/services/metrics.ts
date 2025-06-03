import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class MetricsService {
  static async incrementCounter(name: string, value = 1) {
    try {
      await prisma.$executeRaw`
        INSERT INTO metrics (name, value, created_at)
        VALUES (${name}, ${value}, NOW())
        ON CONFLICT (name) DO UPDATE
        SET value = metrics.value + ${value},
            updated_at = NOW()
      `;
    } catch (error) {
      logger.error('Failed to increment metric counter', { error, name, value });
    }
  }

  static async getCounter(name: string): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ value: number }]>`
        SELECT value FROM metrics WHERE name = ${name}
      `;
      return result[0]?.value || 0;
    } catch (error) {
      logger.error('Failed to get metric counter', { error, name });
      return 0;
    }
  }

  static async getAverageValue(name: string): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ avg: number }]>`
        SELECT AVG(value) as avg FROM metrics WHERE name = ${name}
      `;
      return result[0]?.avg || 0;
    } catch (error) {
      logger.error('Failed to get metric average', { error, name });
      return 0;
    }
  }
} 