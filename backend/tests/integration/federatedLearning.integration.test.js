const request = require('supertest');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const federatedLearningRoutes = require('../../src/routes/federatedLearning');

// Create test app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/federated-learning', federatedLearningRoutes);

// Mock auth middleware for testing
jest.mock('../../src/middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    };
    next();
  }
}));

describe('Federated Learning API Integration Tests', () => {
  let sessionId;
  let participantId;

  beforeAll(async () => {
    // Wait for any async setup
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Session Management', () => {
    test('POST /api/federated-learning/sessions - Initialize session', async () => {
      const response = await request(app)
        .post('/api/federated-learning/sessions')
        .send({
          modelArchitecture: {
            layers: [
              { name: 'dense1', size: 128, activation: 'relu' },
              { name: 'dense2', size: 64, activation: 'relu' },
              { name: 'output', size: 1, activation: 'sigmoid' }
            ]
          },
          config: {
            minParticipants: 2,
            maxParticipants: 10,
            aggregationRounds: 5,
            privacyBudget: 2.0
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBeDefined();
      
      sessionId = response.body.sessionId;
    });

    test('GET /api/federated-learning/sessions/:id/status - Get session status', async () => {
      const response = await request(app)
        .get(`/api/federated-learning/sessions/${sessionId}/status`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.status).toBeDefined();
    });

    test('GET /api/federated-learning/sessions/invalid/status - Should return 404', async () => {
      const response = await request(app)
        .get('/api/federated-learning/sessions/invalid-session/status');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Participant Management', () => {
    test('POST /api/federated-learning/participants - Register participant', async () => {
      const response = await request(app)
        .post('/api/federated-learning/participants')
        .send({
          institutionName: 'Test University',
          contactEmail: 'admin@testuniversity.edu',
          capabilities: {
            maxModelSize: '1GB',
            supportedFrameworks: ['tensorflow', 'pytorch'],
            computeResources: 'high'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.participantId).toBeDefined();
      
      participantId = response.body.participantId;
    });

    test('GET /api/federated-learning/participants - List participants', async () => {
      const response = await request(app)
        .get('/api/federated-learning/participants');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.participants)).toBe(true);
      expect(response.body.participants.length).toBeGreaterThan(0);
    });
  });

  describe('Training Operations', () => {
    test('POST /api/federated-learning/rounds - Start training round', async () => {
      const response = await request(app)
        .post('/api/federated-learning/rounds')
        .send({
          sessionId: sessionId,
          roundConfig: {
            roundNumber: 1,
            timeoutMinutes: 10,
            minParticipants: 2
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.roundId).toBeDefined();
    });

    test('POST /api/federated-learning/participants/:id/updates - Submit model update', async () => {
      const mockModelUpdate = {
        roundId: 'test-round-1',
        weights: [0.1, 0.2, 0.3, 0.4, 0.5],
        metadata: {
          trainingSamples: 1000,
          accuracy: 0.85,
          loss: 0.25,
          trainingTime: 120000
        }
      };

      const response = await request(app)
        .post(`/api/federated-learning/participants/${participantId}/updates`)
        .send(mockModelUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.updateId).toBeDefined();
    });
  });

  describe('Analytics and Monitoring', () => {
    test('GET /api/federated-learning/analytics - Get analytics data', async () => {
      const response = await request(app)
        .get('/api/federated-learning/analytics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.analytics).toBeDefined();
      expect(response.body.analytics.sessions).toBeDefined();
      expect(response.body.analytics.participants).toBeDefined();
    });

    test('GET /api/federated-learning/analytics/export - Export analytics', async () => {
      const response = await request(app)
        .get('/api/federated-learning/analytics/export')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('GET /api/federated-learning/health - Health check', async () => {
      const response = await request(app)
        .get('/api/federated-learning/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Model Management', () => {
    test('GET /api/federated-learning/models/versions - Get model versions', async () => {
      const response = await request(app)
        .get('/api/federated-learning/models/versions')
        .query({ sessionId: sessionId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.versions)).toBe(true);
    });

    test('POST /api/federated-learning/models/rollback/:id - Rollback model', async () => {
      const response = await request(app)
        .post(`/api/federated-learning/models/rollback/${sessionId}`)
        .send({
          targetVersion: 0,
          reason: 'Test rollback'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('GET /api/federated-learning/models/compare - Compare models', async () => {
      const response = await request(app)
        .get('/api/federated-learning/models/compare')
        .query({
          sessionId: sessionId,
          version1: 0,
          version2: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.comparison).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('POST /api/federated-learning/sessions - Invalid architecture', async () => {
      const response = await request(app)
        .post('/api/federated-learning/sessions')
        .send({
          modelArchitecture: {}, // Invalid empty architecture
          config: {}
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/federated-learning/participants - Missing required fields', async () => {
      const response = await request(app)
        .post('/api/federated-learning/participants')
        .send({
          institutionName: 'Test University'
          // Missing contactEmail
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('POST /api/federated-learning/participants/invalid/updates - Invalid participant', async () => {
      const response = await request(app)
        .post('/api/federated-learning/participants/invalid-participant/updates')
        .send({
          roundId: 'test-round',
          weights: [0.1, 0.2, 0.3]
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('Should enforce rate limits on sensitive operations', async () => {
      // Make multiple rapid requests to a rate-limited endpoint
      const promises = Array(15).fill().map(() =>
        request(app)
          .post('/api/federated-learning/rounds')
          .send({
            sessionId: sessionId,
            roundConfig: { roundNumber: 2 }
          })
      );

      const responses = await Promise.all(promises);
      
      // At least some responses should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
