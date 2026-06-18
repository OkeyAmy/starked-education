/**
 * Shared PostgreSQL database connection pool
 * Provides a single connection pool for all DB queries across the application
 */

import { Pool, PoolClient } from 'pg';
import logger from './logger';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/starked',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err: Error) => {
      logger.error('Unexpected PostgreSQL pool error:', err);
    });

    pool.on('connect', () => {
      logger.debug('New PostgreSQL client connected to pool');
    });
  }
  return pool;
}

export async function getClient(): Promise<PoolClient> {
  const p = getPool();
  return await p.connect();
}

export async function query(text: string, params?: any[]): Promise<any> {
  const p = getPool();
  return await p.query(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Safely query the database, returning null instead of throwing on errors
 * Useful for optional tables that may not exist yet
 */
export async function safeQuery(text: string, params?: any[]): Promise<any | null> {
  try {
    return await query(text, params);
  } catch (error: any) {
    // If table doesn't exist, return null gracefully
    if (error.code === '42P01' || error.code === '42P02') {
      logger.debug(`Table not found for query: ${text.substring(0, 100)}`);
      return null;
    }
    throw error;
  }
}
