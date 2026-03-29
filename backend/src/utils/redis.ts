import { createClient, RedisClientType } from 'redis';
import logger from './logger';

let client: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType | null> => {
  if (client) return client;

  client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }) as RedisClientType;

  client.on('error', (err: any) => logger.error(`Redis Client Error: ${err}`));
  client.on('connect', () => logger.info('Connected to Redis for permission caching'));

  try {
    await client.connect();
    return client;
  } catch (err) {
    logger.error(`Failed to connect to Redis, permissions will not be cached: ${err}`);
    client = null;
    return null;
  }
};

export const cachePermissions = async (userId: string, permissions: string[]): Promise<void> => {
  if (!client) return;
  try {
    await client.set(`user_perms:${userId}`, JSON.stringify(permissions), {
      EX: 3600 // 1 hour
    });
  } catch (err) {
    logger.error(`Error caching permissions: ${err}`);
  }
};

export const getCachedPermissions = async (userId: string): Promise<string[] | null> => {
  if (!client) return null;
  try {
    const data = await client.get(`user_perms:${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    logger.error(`Error retrieving cached permissions: ${err}`);
    return null;
  }
};

export const clearCachedPermissions = async (userId: string): Promise<void> => {
  if (!client) return;
  try {
    await client.del(`user_perms:${userId}`);
  } catch (err) {
    logger.error(`Error clearing cached permissions: ${err}`);
  }
};
