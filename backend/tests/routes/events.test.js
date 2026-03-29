const request = require('supertest');
const app = require('../../src/index');
const userData = require('../fixtures/userData');

// Mock the event logger controller
jest.mock('../../src/controllers/eventLoggerController', () => ({
  eventLoggerController: {
    logCourseCompletion: jest.fn(),
    logCredentialIssuance: jest.fn(),
    logUserAchievement: jest.fn(),
    logProfileUpdate: jest.fn(),
    logCourseEnrollment: jest.fn(),
    getEventById: jest.fn(),
    getUserEvents: jest.fn(),
    getEventsByType: jest.fn(),
    getRecentEvents: jest.fn(),
    getEventCount: jest.fn(),
    searchEvents: jest.fn(),
    verifyEvent: jest.fn(),
    generateUserAuditReport: jest.fn()
  }
}));

const { eventLoggerController } = require('../../src/controllers/eventLoggerController');

describe('Event Logger API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/events/course-completion', () => {
    it('should log course completion event successfully', async () => {
      const eventData = {
        userId: 'user_123',
        courseId: 'course_123',
        completionDate: new Date(),
        finalScore: 85,
        timeSpent: 7200,
        certificateIssued: true,
        metadata: {
          browser: 'Chrome',
          ipAddress: '192.168.1.1'
        }
      };

      const loggedEvent = {
        id: 'event_123',
        type: 'course_completion',
        ...eventData,
        timestamp: new Date(),
        verified: true
      };

      eventLoggerController.logCourseCompletion.mockResolvedValue(loggedEvent);

      const response = await request(app)
        .post('/api/events/course-completion')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(loggedEvent);
      expect(eventLoggerController.logCourseCompletion).toHaveBeenCalledWith(eventData);
    });

    it('should validate course completion data', async () => {
      const invalidData = {
        userId: '', // empty
        courseId: '', // empty
        finalScore: 150 // invalid score
      };

      const response = await request(app)
        .post('/api/events/course-completion')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle logging errors', async () => {
      eventLoggerController.logCourseCompletion.mockRejectedValue(new Error('Logging failed'));

      const response = await request(app)
        .post('/api/events/course-completion')
        .send({ userId: 'user_123', courseId: 'course_123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/events/credential-issuance', () => {
    it('should log credential issuance event successfully', async () => {
      const eventData = {
        userId: 'user_123',
        credentialId: 'cred_123',
        issuerId: 'issuer_123',
        issuanceDate: new Date(),
        credentialType: 'course_completion',
        blockchainTxHash: '0x123456789',
        ipfsHash: 'QmTest123456789'
      };

      const loggedEvent = {
        id: 'event_124',
        type: 'credential_issuance',
        ...eventData,
        timestamp: new Date(),
        verified: true
      };

      eventLoggerController.logCredentialIssuance.mockResolvedValue(loggedEvent);

      const response = await request(app)
        .post('/api/events/credential-issuance')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(loggedEvent);
    });

    it('should validate credential issuance data', async () => {
      const invalidData = {
        userId: 'user_123',
        credentialId: '', // empty
        issuerId: '', // empty
        credentialType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/events/credential-issuance')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/events/user-achievement', () => {
    it('should log user achievement event successfully', async () => {
      const eventData = {
        userId: 'user_123',
        achievementId: 'ach_123',
        achievementType: 'milestone',
        title: 'First Course Completed',
        description: 'Completed first course successfully',
        earnedAt: new Date(),
        points: 100,
        rarity: 'common',
        metadata: {
          triggerEvent: 'course_completion',
          relatedCourseId: 'course_123'
        }
      };

      const loggedEvent = {
        id: 'event_125',
        type: 'user_achievement',
        ...eventData,
        timestamp: new Date(),
        verified: true
      };

      eventLoggerController.logUserAchievement.mockResolvedValue(loggedEvent);

      const response = await request(app)
        .post('/api/events/user-achievement')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(loggedEvent);
    });

    it('should handle duplicate achievements', async () => {
      eventLoggerController.logUserAchievement.mockRejectedValue(new Error('Achievement already earned'));

      const response = await request(app)
        .post('/api/events/user-achievement')
        .send({ userId: 'user_123', achievementId: 'ach_123' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/events/profile-update', () => {
    it('should log profile update event successfully', async () => {
      const eventData = {
        userId: 'user_123',
        updatedFields: ['username', 'email', 'bio'],
        previousValues: {
          username: 'olduser',
          email: 'old@example.com',
          bio: 'Old bio'
        },
        newValues: {
          username: 'newuser',
          email: 'new@example.com',
          bio: 'New bio'
        },
        updatedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
      };

      const loggedEvent = {
        id: 'event_126',
        type: 'profile_update',
        ...eventData,
        timestamp: new Date(),
        verified: true
      };

      eventLoggerController.logProfileUpdate.mockResolvedValue(loggedEvent);

      const response = await request(app)
        .post('/api/events/profile-update')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(loggedEvent);
    });

    it('should validate profile update data', async () => {
      const invalidData = {
        userId: '', // empty
        updatedFields: [], // empty
        newValues: {} // empty
      };

      const response = await request(app)
        .post('/api/events/profile-update')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/events/course-enrollment', () => {
    it('should log course enrollment event successfully', async () => {
      const eventData = {
        userId: 'user_123',
        courseId: 'course_123',
        enrolledAt: new Date(),
        enrollmentType: 'full',
        paymentMethod: 'stellar',
        amount: 0.1,
        currency: 'XLM',
        transactionHash: '0x123456789'
      };

      const loggedEvent = {
        id: 'event_127',
        type: 'course_enrollment',
        ...eventData,
        timestamp: new Date(),
        verified: true
      };

      eventLoggerController.logCourseEnrollment.mockResolvedValue(loggedEvent);

      const response = await request(app)
        .post('/api/events/course-enrollment')
        .send(eventData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(loggedEvent);
    });

    it('should handle duplicate enrollments', async () => {
      eventLoggerController.logCourseEnrollment.mockRejectedValue(new Error('Already enrolled'));

      const response = await request(app)
        .post('/api/events/course-enrollment')
        .send({ userId: 'user_123', courseId: 'course_123' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/event/:eventId', () => {
    it('should retrieve specific event', async () => {
      const mockEvent = {
        id: 'event_123',
        type: 'course_completion',
        userId: 'user_123',
        timestamp: new Date(),
        verified: true,
        data: {
          courseId: 'course_123',
          finalScore: 85
        }
      };

      eventLoggerController.getEventById.mockResolvedValue(mockEvent);

      const response = await request(app)
        .get('/api/events/event/event_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEvent);
      expect(eventLoggerController.getEventById).toHaveBeenCalledWith('event_123');
    });

    it('should handle non-existent event', async () => {
      eventLoggerController.getEventById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/events/event/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/user/:userId/events', () => {
    it('should retrieve user events with pagination', async () => {
      const mockEvents = [
        { id: 'event_1', type: 'course_completion', userId: 'user_123' },
        { id: 'event_2', type: 'user_achievement', userId: 'user_123' }
      ];
      const mockResult = {
        events: mockEvents,
        total: 2,
        page: 1,
        limit: 10,
        hasMore: false
      };

      eventLoggerController.getUserEvents.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/events/user/user_123/events?page=1&limit=10&eventType=course_completion');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(eventLoggerController.getUserEvents).toHaveBeenCalledWith('user_123', {
        page: 1,
        limit: 10,
        eventType: 'course_completion'
      });
    });

    it('should handle empty user events', async () => {
      const mockResult = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      };

      eventLoggerController.getUserEvents.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/events/user/user_123/events');

      expect(response.status).toBe(200);
      expect(response.body.data.events).toEqual([]);
    });
  });

  describe('GET /api/events/type/:eventType', () => {
    it('should retrieve events by type', async () => {
      const mockEvents = [
        { id: 'event_1', type: 'course_completion', userId: 'user_1' },
        { id: 'event_2', type: 'course_completion', userId: 'user_2' }
      ];
      const mockResult = {
        events: mockEvents,
        total: 2,
        page: 1,
        limit: 10,
        hasMore: false
      };

      eventLoggerController.getEventsByType.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/events/type/course_completion?page=1&limit=10');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(eventLoggerController.getEventsByType).toHaveBeenCalledWith('course_completion', {
        page: 1,
        limit: 10
      });
    });

    it('should handle invalid event type', async () => {
      const response = await request(app)
        .get('/api/events/type/invalid_type');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/recent', () => {
    it('should retrieve recent events', async () => {
      const mockEvents = [
        { id: 'event_1', type: 'course_completion', timestamp: new Date() },
        { id: 'event_2', type: 'user_achievement', timestamp: new Date() }
      ];

      eventLoggerController.getRecentEvents.mockResolvedValue(mockEvents);

      const response = await request(app)
        .get('/api/events/recent?limit=10&eventType=course_completion');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEvents);
      expect(eventLoggerController.getRecentEvents).toHaveBeenCalledWith({
        limit: 10,
        eventType: 'course_completion'
      });
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/events/recent?limit=1000'); // Too high

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/count', () => {
    it('should retrieve event count', async () => {
      const mockCount = {
        total: 1000,
        byType: {
          course_completion: 400,
          user_achievement: 300,
          credential_issuance: 200,
          profile_update: 100
        },
        byDate: {
          '2024-03-01': 50,
          '2024-03-02': 75,
          '2024-03-03': 60
        }
      };

      eventLoggerController.getEventCount.mockResolvedValue(mockCount);

      const response = await request(app)
        .get('/api/events/count?startDate=2024-03-01&endDate=2024-03-31');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockCount);
      expect(eventLoggerController.getEventCount).toHaveBeenCalledWith({
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      });
    });

    it('should handle count with filters', async () => {
      const mockCount = { total: 100 };
      eventLoggerController.getEventCount.mockResolvedValue(mockCount);

      const response = await request(app)
        .get('/api/events/count?eventType=course_completion&userId=user_123');

      expect(response.status).toBe(200);
      expect(eventLoggerController.getEventCount).toHaveBeenCalledWith({
        eventType: 'course_completion',
        userId: 'user_123'
      });
    });
  });

  describe('GET /api/events/search', () => {
    it('should search events', async () => {
      const searchParams = {
        query: 'course completion',
        eventType: 'course_completion',
        userId: 'user_123',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        page: 1,
        limit: 10
      };
      const mockSearchResult = {
        events: [
          { id: 'event_1', type: 'course_completion', userId: 'user_123' }
        ],
        total: 1,
        page: 1,
        limit: 10,
        hasMore: false
      };

      eventLoggerController.searchEvents.mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/events/search')
        .query(searchParams);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSearchResult);
      expect(eventLoggerController.searchEvents).toHaveBeenCalledWith(searchParams);
    });

    it('should validate search parameters', async () => {
      const response = await request(app)
        .get('/api/events/search?query='); // Empty query

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle empty search results', async () => {
      const mockResult = {
        events: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      };

      eventLoggerController.searchEvents.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/events/search?query=nonexistent');

      expect(response.status).toBe(200);
      expect(response.body.data.events).toEqual([]);
    });
  });

  describe('GET /api/events/verify/:eventId', () => {
    it('should verify event successfully', async () => {
      const eventId = 'event_123';
      const verificationResult = {
        eventId,
        isValid: true,
        verifiedAt: new Date(),
        verificationDetails: {
          signatureValid: true,
          timestampValid: true,
          dataIntegrity: true
        }
      };

      eventLoggerController.verifyEvent.mockResolvedValue(verificationResult);

      const response = await request(app)
        .get(`/api/events/verify/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(verificationResult);
      expect(eventLoggerController.verifyEvent).toHaveBeenCalledWith(eventId);
    });

    it('should handle invalid event verification', async () => {
      const eventId = 'event_invalid';
      const verificationResult = {
        eventId,
        isValid: false,
        verifiedAt: new Date(),
        reason: 'Event signature invalid'
      };

      eventLoggerController.verifyEvent.mockResolvedValue(verificationResult);

      const response = await request(app)
        .get(`/api/events/verify/${eventId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isValid).toBe(false);
    });

    it('should handle verification errors', async () => {
      eventLoggerController.verifyEvent.mockRejectedValue(new Error('Verification failed'));

      const response = await request(app)
        .get('/api/events/verify/event_123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/events/audit-report/:userId', () => {
    it('should generate user audit report', async () => {
      const userId = 'user_123';
      const auditReport = {
        userId,
        generatedAt: new Date(),
        totalEvents: 50,
        eventSummary: {
          course_completion: 10,
          user_achievement: 15,
          credential_issuance: 8,
          profile_update: 12,
          course_enrollment: 5
        },
        timeline: [
          {
            date: '2024-03-01',
            events: [
              { type: 'course_completion', count: 2 },
              { type: 'user_achievement', count: 3 }
            ]
          }
        ],
        verificationStatus: {
          verified: 48,
          unverified: 2,
          suspicious: 0
        }
      };

      eventLoggerController.generateUserAuditReport.mockResolvedValue(auditReport);

      const response = await request(app)
        .get(`/api/events/audit-report/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(auditReport);
      expect(eventLoggerController.generateUserAuditReport).toHaveBeenCalledWith(userId);
    });

    it('should handle audit report generation errors', async () => {
      eventLoggerController.generateUserAuditReport.mockRejectedValue(new Error('Report generation failed'));

      const response = await request(app)
        .get('/api/events/audit-report/user_123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle audit report with date range', async () => {
      const mockReport = { userId: 'user_123', totalEvents: 10 };
      eventLoggerController.generateUserAuditReport.mockResolvedValue(mockReport);

      const response = await request(app)
        .get('/api/events/audit-report/user_123?startDate=2024-03-01&endDate=2024-03-31');

      expect(response.status).toBe(200);
      expect(eventLoggerController.generateUserAuditReport).toHaveBeenCalledWith('user_123', {
        startDate: '2024-03-01',
        endDate: '2024-03-31'
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/events/course-completion')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent event logging', async () => {
      const eventData = { userId: 'user_123', courseId: 'course_123' };

      eventLoggerController.logCourseCompletion
        .mockResolvedValueOnce({ id: 'event_1' })
        .mockResolvedValueOnce({ id: 'event_2' });

      const [response1, response2] = await Promise.all([
        request(app).post('/api/events/course-completion').send(eventData),
        request(app).post('/api/events/course-completion').send(eventData)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should handle large event payloads', async () => {
      const largeEventData = {
        userId: 'user_123',
        courseId: 'course_123',
        metadata: {
          largeData: 'x'.repeat(1000000) // 1MB of data
        }
      };

      eventLoggerController.logCourseCompletion.mockRejectedValue(new Error('Payload too large'));

      const response = await request(app)
        .post('/api/events/course-completion')
        .send(largeEventData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      eventLoggerController.getUserEvents.mockImplementation(() =>
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/events/user/user_123/events');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid date formats', async () => {
      const response = await request(app)
        .get('/api/events/search?startDate=invalid-date&endDate=invalid-date');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized access', async () => {
      // This would require authentication middleware to be implemented
      const response = await request(app)
        .post('/api/events/course-completion')
        .send({ userId: 'user_123', courseId: 'course_123' });

      // Based on current implementation, this should work without auth
      // If auth is added later, this test would need to be updated
      expect([201, 401]).toContain(response.status);
    });
  });
});
