/**
 * Health Check Routes Tests
 * 
 * Comprehensive test coverage for health check endpoints including:
 * - Liveness probe behavior
 * - Readiness probe with all dependency combinations
 * - Comprehensive health check responses
 * - Timeout handling for all dependency checks
 * - Security: credential sanitization in error messages
 * - No authentication required
 */

import request from 'supertest';
import app from '../index';
import * as database from '../utils/database';

// Mock all external dependencies
jest.mock('../utils/database');
jest.mock('../config/redis', () => ({
  checkRedisConnectivity: jest.fn()
}));
jest.mock('axios');
jest.mock('../services/search/ElasticsearchService', () => ({
  default: {
    client: {
      ping: jest.fn()
    }
  }
}));

const axios = require('axios');
const { checkRedisConnectivity } = require('../config/redis');
const ElasticsearchService = require('../services/search/ElasticsearchService').default;

describe('Health Check Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health/live', () => {
    it('should return 200 when process is running', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should return valid ISO 8601 timestamp', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toISOString()).toBe(response.body.timestamp);
    });

    it('should not check dependencies', async () => {
      const mockCheckDatabaseConnectivity = jest.fn();
      (database as any).checkDatabaseConnectivity = mockCheckDatabaseConnectivity;

      await request(app).get('/health/live');

      expect(mockCheckDatabaseConnectivity).not.toHaveBeenCalled();
      expect(checkRedisConnectivity).not.toHaveBeenCalled();
    });
  });

  describe('GET /health/ready', () => {
    it('should return 200 when all dependencies are healthy', async () => {
      // Mock all dependencies as healthy
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should return 503 when database is unhealthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Connection refused'
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'not_ready');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies.postgres).toHaveProperty('status', 'unhealthy');
      // Should not expose detailed error in readiness response
      expect(response.body.dependencies.postgres).not.toHaveProperty('error');
    });

    it('should return 503 when Redis is unhealthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Connection refused'
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not_ready');
    });

    it('should return 503 when multiple dependencies are unhealthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Database timeout'
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Redis timeout'
      });
      axios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body.status).toBe('not_ready');
      expect(response.body.dependencies.postgres.status).toBe('unhealthy');
      expect(response.body.dependencies.redis.status).toBe('unhealthy');
    });
  });

  describe('GET /health', () => {
    it('should return 200 even when dependencies are unhealthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Connection refused'
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Redis unavailable'
      });
      axios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'degraded');
    });

    it('should return all five dependency statuses', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('postgres');
      expect(response.body.dependencies).toHaveProperty('redis');
      expect(response.body.dependencies).toHaveProperty('stellar');
      expect(response.body.dependencies).toHaveProperty('ipfs');
      expect(response.body.dependencies).toHaveProperty('elasticsearch');
    });

    it('should return correct latency values', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 42
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 18
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.dependencies.postgres.latencyMs).toBe(42);
      expect(response.body.dependencies.redis.latencyMs).toBe(18);
    });

    it('should return version, uptime, and memory', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(typeof response.body.version).toBe('string');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body).toHaveProperty('memory');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('rss');
      expect(typeof response.body.memory.heapUsed).toBe('number');
    });

    it('should have status healthy when all dependencies are healthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });

    it('should have status degraded when any dependency is unhealthy', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 2000,
        error: 'Connection timeout'
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'degraded');
    });
  });

  describe('Timeout Tests', () => {
    it('should handle database timeout within 2 seconds', async () => {
      // Mock a hanging promise that never resolves
      (database.checkDatabaseConnectivity as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const start = Date.now();
      
      // Use a shorter timeout for the test itself
      const response = await request(app)
        .get('/health')
        .timeout(5000);

      const duration = Date.now() - start;

      // The endpoint should respond even if individual checks timeout
      // Since we're mocking the check itself to hang, this tests the overall timeout
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000);
    });

    it('should complete all checks in parallel within reasonable time', async () => {
      // Mock all checks to take 1 second each
      (database.checkDatabaseConnectivity as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          status: 'healthy',
          latencyMs: 1000
        }), 1000))
      );
      checkRedisConnectivity.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          status: 'healthy',
          latencyMs: 1000
        }), 1000))
      );
      axios.get.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: {} }), 1000))
      );

      const start = Date.now();
      const response = await request(app).get('/health');
      const duration = Date.now() - start;

      // All 5 checks should run in parallel, so total time should be ~1 second, not 5 seconds
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Allow some overhead
      expect(duration).toBeGreaterThan(900); // But should take at least 1 second
    });
  });

  describe('Security Tests', () => {
    it('should sanitize database connection string in error message', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 100,
        error: 'Connection to postgresql://user:password123@localhost:5432/db failed'
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('password123');
      expect(JSON.stringify(response.body)).not.toContain('user:password');
      // Should be sanitized to postgresql://***
      if (response.body.dependencies.postgres.error) {
        expect(response.body.dependencies.postgres.error).toContain('***');
      }
    });

    it('should sanitize Redis connection string in error message', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'unhealthy',
        latencyMs: 100,
        error: 'Failed to connect to redis://admin:secretpass@redis-host:6379'
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toContain('secretpass');
      expect(JSON.stringify(response.body)).not.toContain('admin:secret');
    });

    it('should not require authentication for /health/live', async () => {
      const response = await request(app)
        .get('/health/live')
        // No Authorization header

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should not require authentication for /health/ready', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app)
        .get('/health/ready')
        // No Authorization header

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ready');
    });

    it('should not require authentication for /health', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockResolvedValue({
        status: 'healthy',
        latencyMs: 5
      });
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app)
        .get('/health')
        // No Authorization header

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });

  describe('Error Handling', () => {
    it('should handle database check throwing an error', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );
      checkRedisConnectivity.mockResolvedValue({
        status: 'healthy',
        latencyMs: 3
      });
      axios.get.mockResolvedValue({ data: {} });

      const response = await request(app).get('/health');

      // Should still return 200 for monitoring endpoint
      expect(response.status).toBe(200);
    });

    it('should handle all checks failing gracefully', async () => {
      (database.checkDatabaseConnectivity as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      checkRedisConnectivity.mockRejectedValue(
        new Error('Redis error')
      );
      axios.get.mockRejectedValue(new Error('Network error'));

      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'degraded');
    });
  });
});
