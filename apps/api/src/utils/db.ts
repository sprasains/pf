import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Log Prisma version
console.log('Prisma version:', require('@prisma/client/package.json').version);

// PostgreSQL connection pool configuration
const poolConfig = {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
  maxUses: 7500, // Maximum number of times a connection can be used before being closed
};

// Create connection pool
export const pool = new Pool(poolConfig);

// Create Prisma client with connection pooling
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log Prisma events
prisma.$on('query', (e) => {
  logger.debug('Prisma Query:', {
    query: e.query,
    params: e.params,
    duration: e.duration,
  });
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error:', e);
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info:', e);
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning:', e);
});

// Pool error handling
pool.on('error', (err: any) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    // Check PostgreSQL connection
    const pgClient = await pool.connect();
    await pgClient.query('SELECT 1');
    pgClient.release();

    // Check Prisma connection
    await prisma.$queryRaw`SELECT 1`;

    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await Promise.all([
    pool.end(),
    prisma.$disconnect(),
  ]);
  process.exit(0);
});

// Export a function to get a client from the pool
export async function getClient() {
  const client = await pool.connect();
  return {
    client,
    release: () => client.release(),
  };
}

// Export a function to run a transaction
export async function runTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const { client, release } = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    release();
  }
} 