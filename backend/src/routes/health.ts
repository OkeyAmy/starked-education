/**
 * Health Check Routes
 * 
 * Implements three health check endpoints for different use cases:
 * 
 * - GET /health/live: Kubernetes liveness probe - confirms process is running
 *   Always returns 200, does not check dependencies. Used to detect if the 
 *   process needs to be restarted.
 * 
 * - GET /health/ready: Kubernetes readiness probe - confirms service can handle traffic
 *   Returns 200 if all critical dependencies are healthy, 503 otherwise.
 *   Load balancers use this to determine if traffic should be routed to this instance.
 * 
 * - GET /health: Comprehensive monitoring endpoint for dashboards
 *   Always returns 200, includes full dependency status, memory usage, and uptime.
 *   Status field is "healthy" if all dependencies are up, "degraded" if any are down.
 * 
 * Security Note: These endpoints do not require authentication and must not expose
 * sensitive information (connection strings, internal IPs, etc.) in error messages.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { checkDatabaseConnectivity, DependencyHealth } from '../utils/database';

const router: Router = Router();

// Redis check
const { checkRedisConnectivity } = require('../config/redis');

// Elasticsearch check
import ElasticsearchService from '../services/search/ElasticsearchService';

// Package version
const packageJson = require('../../../package.json');

/**
 * Check Stellar Horizon node health via HTTP
 */
async function checkStellarConnectivity(): Promise<DependencyHealth> {
  const start = Date.now();
  const horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
  
  try {
    await Promise.race([
      axios.get(horizonUrl, { timeout: 2000 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Stellar check timeout')), 2000)
      )
    ]);
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error?.code === 'ECONNREFUSED' ? 'Connection refused' : 'Stellar node unavailable'
    };
  }
}

/**
 * Check IPFS node health via HTTP
 */
async function checkIPFSConnectivity(): Promise<DependencyHealth> {
  const start = Date.now();
  const ipfsHost = process.env.IPFS_HOST || 'localhost';
  const ipfsPort = process.env.IPFS_PORT || '5001';
  const ipfsApiPath = process.env.IPFS_API_PATH || '/api/v0';
  const ipfsUrl = `http://${ipfsHost}:${ipfsPort}${ipfsApiPath}/version`;
  
  try {
    await Promise.race([
      axios.get(ipfsUrl, { timeout: 2000 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('IPFS check timeout')), 2000)
      )
    ]);
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error?.code === 'ECONNREFUSED' ? 'Connection refused' : 'IPFS node unavailable'
    };
  }
}

/**
 * Check Elasticsearch connectivity via client ping
 */
async function checkElasticsearchConnectivity(): Promise<DependencyHealth> {
  const start = Date.now();
  
  try {
    if (!process.env.ELASTICSEARCH_URL) {
      return {
        status: 'unhealthy',
        latencyMs: 0,
        error: 'Not configured'
      };
    }

    await Promise.race([
      (ElasticsearchService as any).client.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Elasticsearch check timeout')), 2000)
      )
    ]);
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: error?.message?.includes('timeout') ? 'Connection timeout' : 'Elasticsearch unavailable'
    };
  }
}

/**
 * Run all dependency checks in parallel
 */
async function checkAllDependencies() {
  const [postgres, redis, stellar, ipfs, elasticsearch] = await Promise.all([
    checkDatabaseConnectivity(),
    checkRedisConnectivity(),
    checkStellarConnectivity(),
    checkIPFSConnectivity(),
    checkElasticsearchConnectivity()
  ]);

  return { postgres, redis, stellar, ipfs, elasticsearch };
}

/**
 * GET /health/live
 * Liveness probe - only checks if process is alive
 * Always returns 200
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks if service can handle traffic
 * Returns 200 if all dependencies healthy, 503 otherwise
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dependencies = await checkAllDependencies();
    
    const allHealthy = Object.values(dependencies).every(
      (dep: DependencyHealth) => dep.status === 'healthy'
    );

    if (allHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      // Return 503 but don't expose detailed errors to load balancer
      // Log full details server-side for debugging
      console.error('Readiness check failed:', JSON.stringify(dependencies, null, 2));
      
      res.status(503).json({
        status: 'not_ready',
        dependencies: Object.fromEntries(
          Object.entries(dependencies).map(([key, value]) => [
            key,
            { status: (value as DependencyHealth).status }
          ])
        )
      });
    }
  } catch (error) {
    console.error('Readiness check error:', error);
    res.status(503).json({ status: 'not_ready' });
  }
});

/**
 * GET /health
 * Comprehensive health check for monitoring dashboards
 * Always returns 200 with full status information
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dependencies = await checkAllDependencies();
    
    const allHealthy = Object.values(dependencies).every(
      (dep: DependencyHealth) => dep.status === 'healthy'
    );

    const memory = process.memoryUsage();

    res.status(200).json({
      status: allHealthy ? 'healthy' : 'degraded',
      version: packageJson.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        rss: memory.rss
      },
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([key, value]) => {
          const dep = value as DependencyHealth;
          // Sanitize error messages - never expose connection strings or internal details
          const sanitizedError = dep.error 
            ? dep.error.replace(/postgresql:\/\/[^@]+@[^/]+/, 'postgresql://***')
                       .replace(/redis:\/\/[^@]+@[^/]+/, 'redis://***')
                       .replace(/password[^&\s]+/, 'password=***')
            : undefined;
          
          return [
            key,
            {
              status: dep.status,
              latencyMs: dep.latencyMs,
              ...(sanitizedError && { error: sanitizedError })
            }
          ];
        })
      )
    });
  } catch (error) {
    // Even on error, return 200 for monitoring endpoint
    console.error('Health check error:', error);
    
    res.status(200).json({
      status: 'degraded',
      version: packageJson.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        rss: 0
      },
      dependencies: {
        postgres: { status: 'unhealthy', latencyMs: 0, error: 'Check failed' },
        redis: { status: 'unhealthy', latencyMs: 0, error: 'Check failed' },
        stellar: { status: 'unhealthy', latencyMs: 0, error: 'Check failed' },
        ipfs: { status: 'unhealthy', latencyMs: 0, error: 'Check failed' },
        elasticsearch: { status: 'unhealthy', latencyMs: 0, error: 'Check failed' }
      }
    });
  }
});

export default router;
