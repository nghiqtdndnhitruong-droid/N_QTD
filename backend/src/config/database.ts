import { PrismaClient } from '@prisma/client';
import { env } from './env';
import { logger } from './logger';

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development'
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ]
    : [{ level: 'error', emit: 'stdout' }],
});

if (env.nodeEnv === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(`Prisma Query: ${e.query} — Duration: ${e.duration}ms`);
  });
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export { prisma };

