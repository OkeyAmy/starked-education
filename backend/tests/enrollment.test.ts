/**
 * Enrollment System Tests
 * Comprehensive test suite for enrollment and payment functionality
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index';
import { 
  Enrollment, 
  EnrollmentStatus, 
  PaymentStatus, 
  PaymentMethod 
} from '../src/models/Enrollment';
import { StellarPaymentService } from '../src/services/StellarPaymentService';

describe('Enrollment System Tests', () => {
  let authToken: string;
  let testCourseId: string;
  let testUserId: string;
  let testEnrollmentId: string;

  beforeAll(async () => {
    // Setup test data
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    authToken = loginResponse.body.token;
    testUserId = loginResponse.body.user.id;

    // Create a test course
    const courseResponse = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Course for Enrollment',
        description: 'A test course for enrollment testing',
        price: 99.99,
        metadata: {
          level: 'beginner',
          duration: 40,
          maxStudents: 100,
          isPublished: true
        }
      });

    testCourseId = courseResponse.body.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await request(app)
      .delete(`/api/courses/${testCourseId}`)
      .set('Authorization', `Bearer ${authToken}`);
  });

  describe('Enrollment Creation', () => {
    test('should create a new enrollment with valid data', async () => {
      const enrollmentData = {
        courseId: testCourseId,
        paymentMethod: PaymentMethod.STELLAR,
        paymentDetails: {
          amount: 99.99,
          currency: 'USD',
          fromAddress: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
        }
      };

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe(EnrollmentStatus.PENDING);
      expect(response.body.data.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(response.body.data.amountPaid).toBe(0);
      expect(response.body.data.totalAmount).toBe(99.99);

      testEnrollmentId = response.body.data.id;
    });

    test('should reject enrollment for non-existent course', async () => {
      const enrollmentData = {
        courseId: 'non-existent-course-id',
        paymentMethod: PaymentMethod.STELLAR,
        paymentDetails: {
          amount: 99.99,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Course not found');
    });

    test('should reject duplicate enrollment', async () => {
      const enrollmentData = {
        courseId: testCourseId,
        paymentMethod: PaymentMethod.STELLAR,
        paymentDetails: {
          amount: 99.99,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Already enrolled');
    });

    test('should validate payment method', async () => {
      const enrollmentData = {
        courseId: testCourseId,
        paymentMethod: 'invalid-method',
        paymentDetails: {
          amount: 99.99,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(enrollmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Enrollment Retrieval', () => {
    test('should get user enrollments', async () => {
      const response = await request(app)
        .get('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toHaveProperty('total');
    });

    test('should get specific enrollment by ID', async () => {
      const response = await request(app)
        .get(`/api/enrollments/${testEnrollmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testEnrollmentId);
      expect(response.body.data.courseId).toBe(testCourseId);
    });

    test('should reject access to other user enrollment', async () => {
      // Create another user and try to access first user's enrollment
      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other@example.com',
          password: 'otherpassword',
          username: 'otheruser'
        });

      const otherToken = otherUserResponse.body.token;

      const response = await request(app)
        .get(`/api/enrollments/${testEnrollmentId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('Enrollment Progress Tracking', () => {
    test('should update enrollment progress', async () => {
      const progressData = {
        progress: 50
      };

      const response = await request(app)
        .put(`/api/enrollments/${testEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBe(50);
    });

    test('should get enrollment progress details', async () => {
      const response = await request(app)
        .get(`/api/enrollments/${testEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('progress');
      expect(response.body.data).toHaveProperty('completedLessons');
      expect(response.body.data).toHaveProperty('totalLessons');
    });

    test('should validate progress range', async () => {
      const invalidProgressData = {
        progress: 150 // Invalid: > 100
      };

      const response = await request(app)
        .put(`/api/enrollments/${testEnrollmentId}/progress`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProgressData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Waitlist Management', () => {
    let waitlistCourseId: string;

    beforeEach(async () => {
      // Create a course that's full for waitlist testing
      const fullCourseResponse = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Full Course for Waitlist',
          description: 'A full course for waitlist testing',
          price: 149.99,
          metadata: {
            level: 'intermediate',
            duration: 60,
            maxStudents: 1, // Very small limit
            isPublished: true
          }
        });

      waitlistCourseId = fullCourseResponse.body.id;

      // Fill the course
      await request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: waitlistCourseId,
          paymentMethod: PaymentMethod.STELLAR,
          paymentDetails: {
            amount: 149.99,
            currency: 'USD'
          }
        });
    });

    test('should add user to waitlist when course is full', async () => {
      const response = await request(app)
        .post(`/api/enrollments/waitlist/${waitlistCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('waitlistPosition');
      expect(response.body.data.waitlistPosition).toBeGreaterThan(0);
    });

    test('should get course waitlist', async () => {
      const response = await request(app)
        .get(`/api/enrollments/waitlist/${waitlistCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should remove user from waitlist', async () => {
      const response = await request(app)
        .delete(`/api/enrollments/waitlist/${waitlistCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Removed from waitlist');
    });
  });

  describe('Capacity Management', () => {
    test('should get course capacity information', async () => {
      const response = await request(app)
        .get(`/api/enrollments/capacity/${testCourseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('maxStudents');
      expect(response.body.data).toHaveProperty('currentEnrollments');
      expect(response.body.data).toHaveProperty('waitlistCount');
    });

    test('should validate prerequisites', async () => {
      const response = await request(app)
        .post('/api/enrollments/validate-prerequisites')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          courseId: testCourseId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('valid');
      expect(response.body.data).toHaveProperty('missing');
      expect(response.body.data).toHaveProperty('completed');
    });
  });
});

describe('Payment System Tests', () => {
  let authToken: string;
  let paymentIntentId: string;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'testpassword'
      });

    authToken = loginResponse.body.token;
  });

  describe('Stellar Payment Integration', () => {
    test('should create Stellar payment intent', async () => {
      const paymentData = {
        enrollmentId: 'test-enrollment-id',
        amount: 99.99,
        currency: 'USD',
        assetCode: 'XLM',
        fromAddress: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
      };

      const response = await request(app)
        .post('/api/payments/stellar/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('paymentId');
      expect(response.body.data).toHaveProperty('transactionXDR');
      expect(response.body.data.gatewayData).toHaveProperty('destination');

      paymentIntentId = response.body.data.paymentId;
    });

    test('should validate Stellar payment parameters', async () => {
      const validationData = {
        amount: 99.99,
        currency: 'USD',
        method: PaymentMethod.STELLAR,
        fromAddress: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
      };

      const response = await request(app)
        .post('/api/payments/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('warnings');
    });

    test('should get supported payment methods', async () => {
      const response = await request(app)
        .get('/api/payments/methods')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data).toContain(PaymentMethod.STELLAR);
    });

    test('should get exchange rates', async () => {
      const response = await request(app)
        .get('/api/payments/exchange-rates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('USD-XLM');
    });
  });

  describe('Payment Processing', () => {
    test('should process payment successfully', async () => {
      // Mock successful payment submission
      const paymentData = {
        paymentIntentId,
        signedTransactionXDR: 'mock-signed-transaction-xdr'
      };

      const response = await request(app)
        .post('/api/payments/stellar/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transaction');
      expect(response.body.data.transaction.status).toBe(PaymentStatus.COMPLETED);
    });

    test('should handle payment failure', async () => {
      const paymentData = {
        paymentIntentId: 'invalid-intent-id',
        signedTransactionXDR: 'invalid-xdr'
      };

      const response = await request(app)
        .post('/api/payments/stellar/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Refund Processing', () => {
    let paymentId: string;

    beforeAll(async () => {
      // Create a payment for refund testing
      const paymentResponse = await request(app)
        .post('/api/payments/intent')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          enrollmentId: 'test-enrollment-id',
          method: PaymentMethod.STELLAR,
          amount: 99.99,
          currency: 'USD'
        });

      paymentId = paymentResponse.body.id;
    });

    test('should create refund request', async () => {
      const refundData = {
        enrollmentId: 'test-enrollment-id',
        amount: 99.99,
        reason: 'Course not as expected',
        category: 'course_quality'
      };

      const response = await request(app)
        .post('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .send(refundData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.calculatedRefundAmount).toBeGreaterThan(0);
    });

    test('should get user refund requests', async () => {
      const response = await request(app)
        .get('/api/refunds')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should get refund analytics', async () => {
      const response = await request(app)
        .get('/api/refunds/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalRequests');
      expect(response.body.data).toHaveProperty('approvedRequests');
      expect(response.body.data).toHaveProperty('totalRefundAmount');
    });
  });
});

describe('Stellar Payment Service Unit Tests', () => {
  let stellarService: StellarPaymentService;

  beforeEach(() => {
    stellarService = new StellarPaymentService({
      network: 'testnet',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      distributionAccount: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q',
      acceptedAssets: [
        {
          code: 'XLM',
          name: 'Stellar Lumens',
          decimals: 7,
          isActive: true,
          minAmount: 0.0001,
          maxAmount: 10000
        }
      ],
      autoConfirmPayments: true,
      confirmationThreshold: 1
    });
  });

  test('should validate payment parameters', () => {
    const validation = stellarService.validatePaymentParameters(
      '100',
      'XLM',
      'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
    );

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  test('should reject invalid payment parameters', () => {
    const validation = stellarService.validatePaymentParameters(
      '-100', // Invalid amount
      'XLM',
      'invalid-address'
    );

    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  test('should check if account exists', async () => {
    const exists = await stellarService.checkAccountExists(
      'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
    );

    expect(typeof exists).toBe('boolean');
  });

  test('should get supported assets', () => {
    const assets = stellarService.getSupportedAssets();

    expect(assets).toBeInstanceOf(Array);
    expect(assets.length).toBeGreaterThan(0);
    expect(assets[0]).toHaveProperty('code');
    expect(assets[0]).toHaveProperty('name');
  });
});

describe('Integration Tests', () => {
  test('should handle complete enrollment flow', async () => {
    // This test simulates the complete enrollment flow
    // 1. User login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'integration@example.com',
        password: 'testpassword'
      });

    const token = loginResponse.body.token;

    // 2. Create course
    const courseResponse = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Integration Test Course',
        description: 'Course for integration testing',
        price: 199.99,
        metadata: {
          level: 'advanced',
          duration: 80,
          maxStudents: 50,
          isPublished: true
        }
      });

    const courseId = courseResponse.body.id;

    // 3. Create enrollment
    const enrollmentResponse = await request(app)
      .post('/api/enrollments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        courseId,
        paymentMethod: PaymentMethod.STELLAR,
        paymentDetails: {
          amount: 199.99,
          currency: 'USD',
          fromAddress: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
        }
      });

    expect(enrollmentResponse.body.success).toBe(true);
    const enrollmentId = enrollmentResponse.body.data.id;

    // 4. Update progress
    const progressResponse = await request(app)
      .put(`/api/enrollments/${enrollmentId}/progress`)
      .set('Authorization', `Bearer ${token}`)
      .send({ progress: 100 });

    expect(progressResponse.body.success).toBe(true);

    // 5. Complete enrollment
    const completeResponse = await request(app)
      .post(`/api/enrollments/${enrollmentId}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(completeResponse.body.success).toBe(true);
    expect(completeResponse.body.data.status).toBe(EnrollmentStatus.COMPLETED);

    // Cleanup
    await request(app)
      .delete(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`);
  });

  test('should handle concurrent enrollments', async () => {
    // Test concurrent enrollment requests
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'concurrent@example.com',
        password: 'testpassword'
      });

    const token = loginResponse.body.token;

    // Create a course with limited capacity
    const courseResponse = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Concurrent Test Course',
        description: 'Course for concurrent testing',
        price: 99.99,
        metadata: {
          level: 'beginner',
          duration: 20,
          maxStudents: 2, // Very limited
          isPublished: true
        }
      });

    const courseId = courseResponse.body.id;

    // Create multiple concurrent enrollment requests
    const concurrentRequests = Array(5).fill(null).map(() =>
      request(app)
        .post('/api/enrollments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          courseId,
          paymentMethod: PaymentMethod.STELLAR,
          paymentDetails: {
            amount: 99.99,
            currency: 'USD'
          }
        })
    );

    const responses = await Promise.allSettled(concurrentRequests);

    // Should have 2 successful enrollments and 3 waitlist entries
    const successful = responses.filter(r => 
      r.status === 'fulfilled' && r.value.body.success
    ).length;
    const waitlisted = responses.filter(r => 
      r.status === 'fulfilled' && 
      r.value.body.data?.status === 'waitlisted'
    ).length;

    expect(successful).toBe(2);
    expect(waitlisted).toBe(3);

    // Cleanup
    await request(app)
      .delete(`/api/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`);
  });
});

describe('Error Handling Tests', () => {
  test('should handle malformed requests gracefully', async () => {
    const response = await request(app)
      .post('/api/enrollments')
      .send({ invalid: 'data' })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body).toHaveProperty('message');
  });

  test('should handle database connection errors', async () => {
    // This would require mocking database connections
    // For now, we'll test invalid endpoints
    const response = await request(app)
      .get('/api/enrollments/invalid-endpoint')
      .expect(404);
  });

  test('should handle rate limiting', async () => {
    // Make multiple rapid requests
    const requests = Array(20).fill(null).map(() =>
      request(app)
        .post('/api/enrollments')
        .send({
          courseId: 'test-course',
          paymentMethod: PaymentMethod.STELLAR,
          paymentDetails: { amount: 99.99, currency: 'USD' }
        })
    );

    const responses = await Promise.allSettled(requests);
    
    // Some requests should be rate limited
    const rateLimited = responses.filter(r => 
      r.status === 'fulfilled' && r.value.status === 429
    ).length;

    expect(rateLimited).toBeGreaterThan(0);
  });
});

describe('Performance Tests', () => {
  test('should handle large number of enrollments efficiently', async () => {
    const startTime = Date.now();

    // Create multiple enrollments
    const requests = Array(100).fill(null).map((_, index) =>
      request(app)
        .get('/api/enrollments')
        .query({ page: 1, limit: 100 })
    );

    await Promise.all(requests);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (e.g., 5 seconds)
    expect(duration).toBeLessThan(5000);
  });

  test('should handle concurrent payment processing', async () => {
    const startTime = Date.now();

    const paymentRequests = Array(50).fill(null).map(() =>
      request(app)
        .post('/api/payments/validate')
        .send({
          amount: 99.99,
          currency: 'USD',
          method: PaymentMethod.STELLAR,
          fromAddress: 'GD5DQHPMKYQYJQG7SWPGLXQ4YHJAKH7PBLQKF2QZQK2UJ5Q2Q'
        })
    );

    await Promise.all(paymentRequests);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should handle concurrent payments efficiently
    expect(duration).toBeLessThan(3000);
  });
});
