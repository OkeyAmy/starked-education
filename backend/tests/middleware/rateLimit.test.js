const express = require('express');
const request = require('supertest');
const redisConfig = require('../../src/config/redis');
const {
  authLimiter,
  contentWriteLimiter,
  readLimiter,
  publicRateLimitTiers,
} = require('../../src/middleware/rateLimiter');

const clearRateLimitKeys = async () => {
  const keys = await redisConfig.client.keys('rl:*');
  if (keys.length > 0) {
    await redisConfig.client.del(keys);
  }
};

const createTestApp = (limiter, handler = (_req, res) => res.json({ success: true })) => {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    if (req.headers['x-user-id']) {
      req.user = { id: req.headers['x-user-id'], role: 'student' };
    }
    next();
  });
  app.all('/limited', limiter, handler);
  return app;
};

describe('Public API rate limiting middleware', () => {
  beforeAll(async () => {
    if (!redisConfig.isConnected) {
      await redisConfig.initialize();
    }
  });

  afterAll(async () => {
    await redisConfig.disconnect();
  });

  beforeEach(async () => {
    await clearRateLimitKeys();
  });

  test('defines the maintainer-requested public tiers', () => {
    expect(publicRateLimitTiers.strict).toMatchObject({
      windowMs: 60 * 1000,
      max: 5,
      keyByUser: false,
    });
    expect(publicRateLimitTiers.moderate).toMatchObject({
      windowMs: 60 * 1000,
      max: 30,
      keyByUser: true,
    });
    expect(publicRateLimitTiers.liberal).toMatchObject({
      windowMs: 60 * 1000,
      max: 100,
      keyByUser: false,
    });
  });

  test('enforces strict auth limits at 5 requests per minute per IP with X-RateLimit headers', async () => {
    const app = createTestApp(authLimiter);

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app).post('/limited').set('x-test-security', 'true');
      expect(response.status).toBe(200);
      expect(response.headers['x-ratelimit-limit']).toBe('5');
    }

    const blocked = await request(app).post('/limited').set('x-test-security', 'true');

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      message: 'Too many authentication attempts, please try again after a minute',
    });
    expect(blocked.headers['x-ratelimit-limit']).toBe('5');
  });

  test('enforces moderate content write limits per authenticated user', async () => {
    const app = createTestApp(contentWriteLimiter);

    for (let i = 0; i < 30; i += 1) {
      const response = await request(app)
        .post('/limited')
        .set('x-test-security', 'true')
        .set('x-user-id', 'user-a');
      expect(response.status).toBe(200);
    }

    const blocked = await request(app)
      .post('/limited')
      .set('x-test-security', 'true')
      .set('x-user-id', 'user-a');

    const otherUser = await request(app)
      .post('/limited')
      .set('x-test-security', 'true')
      .set('x-user-id', 'user-b');

    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-limit']).toBe('30');
    expect(otherUser.status).toBe(200);
  });

  test('enforces liberal read limits at 100 requests per minute per IP', async () => {
    const app = createTestApp(readLimiter);

    for (let i = 0; i < 100; i += 1) {
      const response = await request(app).get('/limited').set('x-test-security', 'true');
      expect(response.status).toBe(200);
    }

    const blocked = await request(app).get('/limited').set('x-test-security', 'true');

    expect(blocked.status).toBe(429);
    expect(blocked.headers['x-ratelimit-limit']).toBe('100');
  });
});
