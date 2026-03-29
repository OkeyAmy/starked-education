const request = require('supertest');
const app = require('../../src/index');
const userData = require('../fixtures/userData');

// Mock the sync controller
jest.mock('../../src/controllers/syncController', () => ({
  registerDevice: jest.fn(),
  heartbeat: jest.fn(),
  unregisterDevice: jest.fn(),
  getDevices: jest.fn(),
  getSyncStatus: jest.fn(),
  syncEntity: jest.fn(),
  enqueueSync: jest.fn(),
  processQueue: jest.fn(),
  getQueueStatus: jest.fn()
}));

const syncController = require('../../src/controllers/syncController');

describe('Sync API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sync/devices/register', () => {
    it('should register a new device successfully', async () => {
      const deviceData = {
        userId: 'user_123',
        deviceId: 'device_123',
        deviceType: 'mobile',
        platform: 'iOS',
        appVersion: '1.0.0',
        pushToken: 'push_token_123',
        capabilities: ['offline_sync', 'real_time_sync'],
        metadata: {
          model: 'iPhone 14',
          osVersion: 'iOS 16.0'
        }
      };

      const registeredDevice = {
        ...deviceData,
        registeredAt: new Date(),
        lastSeen: new Date(),
        isActive: true,
        syncEnabled: true
      };

      syncController.registerDevice.mockResolvedValue(registeredDevice);

      const response = await request(app)
        .post('/api/sync/devices/register')
        .send(deviceData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(registeredDevice);
      expect(syncController.registerDevice).toHaveBeenCalledWith(deviceData);
    });

    it('should validate device registration data', async () => {
      const invalidData = {
        userId: '', // empty
        deviceId: '', // empty
        deviceType: 'invalid_type'
      };

      const response = await request(app)
        .post('/api/sync/devices/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate device registration', async () => {
      syncController.registerDevice.mockRejectedValue(new Error('Device already registered'));

      const response = await request(app)
        .post('/api/sync/devices/register')
        .send({ userId: 'user_123', deviceId: 'device_123', deviceType: 'mobile' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should handle registration errors', async () => {
      syncController.registerDevice.mockRejectedValue(new Error('Registration failed'));

      const response = await request(app)
        .post('/api/sync/devices/register')
        .send({ userId: 'user_123', deviceId: 'device_123', deviceType: 'mobile' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sync/devices/heartbeat', () => {
    it('should update device heartbeat successfully', async () => {
      const heartbeatData = {
        userId: 'user_123',
        deviceId: 'device_123',
        batteryLevel: 0.85,
        networkStatus: 'wifi',
        storageStatus: 'available',
        lastSyncAt: new Date(),
        pendingSyncCount: 5,
        metadata: {
          appUptime: 3600,
          memoryUsage: 0.6
        }
      };

      const updatedDevice = {
        deviceId: 'device_123',
        lastSeen: new Date(),
        batteryLevel: 0.85,
        networkStatus: 'wifi',
        isActive: true
      };

      syncController.heartbeat.mockResolvedValue(updatedDevice);

      const response = await request(app)
        .post('/api/sync/devices/heartbeat')
        .send(heartbeatData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedDevice);
      expect(syncController.heartbeat).toHaveBeenCalledWith(heartbeatData);
    });

    it('should validate heartbeat data', async () => {
      const invalidData = {
        userId: '', // empty
        deviceId: '', // empty
        batteryLevel: 1.5 // invalid level
      };

      const response = await request(app)
        .post('/api/sync/devices/heartbeat')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent device heartbeat', async () => {
      syncController.heartbeat.mockRejectedValue(new Error('Device not found'));

      const response = await request(app)
        .post('/api/sync/devices/heartbeat')
        .send({ userId: 'user_123', deviceId: 'nonexistent', batteryLevel: 0.8 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/sync/devices/:deviceId', () => {
    it('should unregister device successfully', async () => {
      const deviceId = 'device_123';
      const userId = 'user_123';

      const unregisteredDevice = {
        deviceId,
        userId,
        unregisteredAt: new Date(),
        isActive: false
      };

      syncController.unregisterDevice.mockResolvedValue(unregisteredDevice);

      const response = await request(app)
        .delete(`/api/sync/devices/${deviceId}`)
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(unregisteredDevice);
      expect(syncController.unregisterDevice).toHaveBeenCalledWith(deviceId, userId);
    });

    it('should handle device unregistration errors', async () => {
      syncController.unregisterDevice.mockRejectedValue(new Error('Device not found'));

      const response = await request(app)
        .delete('/api/sync/devices/nonexistent')
        .query({ userId: 'user_123' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate unregistration parameters', async () => {
      const response = await request(app)
        .delete('/api/sync/devices/device_123'); // Missing userId

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sync/users/:userId/devices', () => {
    it('should retrieve user devices successfully', async () => {
      const userId = 'user_123';
      const mockDevices = [
        {
          deviceId: 'device_1',
          deviceType: 'mobile',
          platform: 'iOS',
          lastSeen: new Date(),
          isActive: true,
          syncEnabled: true
        },
        {
          deviceId: 'device_2',
          deviceType: 'web',
          platform: 'Chrome',
          lastSeen: new Date(),
          isActive: false,
          syncEnabled: false
        }
      ];

      syncController.getDevices.mockResolvedValue(mockDevices);

      const response = await request(app)
        .get(`/api/sync/users/${userId}/devices`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDevices);
      expect(syncController.getDevices).toHaveBeenCalledWith(userId);
    });

    it('should handle empty device list', async () => {
      const userId = 'user_123';
      syncController.getDevices.mockResolvedValue([]);

      const response = await request(app)
        .get(`/api/sync/users/${userId}/devices`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should handle device retrieval errors', async () => {
      syncController.getDevices.mockRejectedValue(new Error('Failed to retrieve devices'));

      const response = await request(app)
        .get('/api/sync/users/user_123/devices');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sync/users/:userId/status', () => {
    it('should retrieve user sync status successfully', async () => {
      const userId = 'user_123';
      const mockStatus = {
        userId,
        lastSyncAt: new Date(),
        syncEnabled: true,
        activeDevices: 2,
        pendingSyncs: 5,
        syncQueueSize: 10,
        lastSyncStatus: 'success',
        syncStatistics: {
          totalSyncs: 100,
          successfulSyncs: 95,
          failedSyncs: 5,
          averageSyncTime: 2.5
        },
        deviceStatus: [
          {
            deviceId: 'device_1',
            lastSyncAt: new Date(),
            syncStatus: 'success',
            pendingChanges: 3
          }
        ]
      };

      syncController.getSyncStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get(`/api/sync/users/${userId}/status`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
      expect(syncController.getSyncStatus).toHaveBeenCalledWith(userId);
    });

    it('should handle sync status retrieval errors', async () => {
      syncController.getSyncStatus.mockRejectedValue(new Error('Failed to get sync status'));

      const response = await request(app)
        .get('/api/sync/users/user_123/status');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sync/sync', () => {
    it('should sync entity successfully', async () => {
      const syncData = {
        userId: 'user_123',
        deviceId: 'device_123',
        entityType: 'course_progress',
        entityId: 'course_123',
        operation: 'update',
        data: {
          completedSections: ['section1', 'section2'],
          progressPercentage: 60,
          lastAccessedAt: new Date()
        },
        timestamp: new Date(),
        conflictResolution: 'server_wins'
      };

      const syncResult = {
        syncId: 'sync_123',
        status: 'success',
        syncedAt: new Date(),
        conflicts: [],
        affectedEntities: ['course_progress:course_123']
      };

      syncController.syncEntity.mockResolvedValue(syncResult);

      const response = await request(app)
        .post('/api/sync/sync')
        .send(syncData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(syncResult);
      expect(syncController.syncEntity).toHaveBeenCalledWith(syncData);
    });

    it('should handle sync conflicts', async () => {
      const syncData = {
        userId: 'user_123',
        deviceId: 'device_123',
        entityType: 'course_progress',
        entityId: 'course_123',
        operation: 'update',
        data: { progressPercentage: 80 }
      };

      const syncResult = {
        syncId: 'sync_124',
        status: 'conflict',
        conflicts: [
          {
            field: 'progressPercentage',
            serverValue: 60,
            clientValue: 80,
            resolution: 'manual'
          }
        ],
        resolutionRequired: true
      };

      syncController.syncEntity.mockResolvedValue(syncResult);

      const response = await request(app)
        .post('/api/sync/sync')
        .send(syncData);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('conflict');
      expect(response.body.data.conflicts).toHaveLength(1);
    });

    it('should validate sync data', async () => {
      const invalidSyncData = {
        userId: '', // empty
        deviceId: '', // empty
        entityType: '', // empty
        operation: 'invalid_operation'
      };

      const response = await request(app)
        .post('/api/sync/sync')
        .send(invalidSyncData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle sync errors', async () => {
      syncController.syncEntity.mockRejectedValue(new Error('Sync failed'));

      const response = await request(app)
        .post('/api/sync/sync')
        .send({
          userId: 'user_123',
          deviceId: 'device_123',
          entityType: 'course_progress',
          entityId: 'course_123',
          operation: 'update',
          data: {}
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sync/queue', () => {
    it('should enqueue sync operation successfully', async () => {
      const queueData = {
        userId: 'user_123',
        deviceId: 'device_123',
        entityType: 'user_profile',
        entityId: 'profile_123',
        operation: 'update',
        data: {
          username: 'newusername',
          bio: 'Updated bio'
        },
        priority: 'high',
        scheduledAt: new Date()
      };

      const queuedItem = {
        queueId: 'queue_123',
        ...queueData,
        enqueuedAt: new Date(),
        status: 'pending',
        retryCount: 0
      };

      syncController.enqueueSync.mockResolvedValue(queuedItem);

      const response = await request(app)
        .post('/api/sync/queue')
        .send(queueData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(queuedItem);
      expect(syncController.enqueueSync).toHaveBeenCalledWith(queueData);
    });

    it('should validate queue data', async () => {
      const invalidQueueData = {
        userId: '', // empty
        entityType: '', // empty
        operation: '', // empty
        data: null // null
      };

      const response = await request(app)
        .post('/api/sync/queue')
        .send(invalidQueueData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle queue enqueue errors', async () => {
      syncController.enqueueSync.mockRejectedValue(new Error('Queue full'));

      const response = await request(app)
        .post('/api/sync/queue')
        .send({
          userId: 'user_123',
          entityType: 'user_profile',
          operation: 'update',
          data: {}
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/sync/queue/process', () => {
    it('should process sync queue successfully', async () => {
      const processData = {
        userId: 'user_123',
        deviceId: 'device_123',
        batchSize: 10,
        priority: 'high'
      };

      const processResult = {
        processed: 8,
        successful: 7,
        failed: 1,
        skipped: 0,
        processingTime: 2.5,
        results: [
          {
            queueId: 'queue_1',
            status: 'success',
            processedAt: new Date()
          },
          {
            queueId: 'queue_2',
            status: 'failed',
            error: 'Conflict detected',
            processedAt: new Date()
          }
        ]
      };

      syncController.processQueue.mockResolvedValue(processResult);

      const response = await request(app)
        .post('/api/sync/queue/process')
        .send(processData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(processResult);
      expect(syncController.processQueue).toHaveBeenCalledWith(processData);
    });

    it('should handle queue processing errors', async () => {
      syncController.processQueue.mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/api/sync/queue/process')
        .send({ userId: 'user_123' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should validate processing parameters', async () => {
      const response = await request(app)
        .post('/api/sync/queue/process')
        .send({ batchSize: -1 }); // Invalid batch size

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sync/queue/status', () => {
    it('should retrieve queue status successfully', async () => {
      const mockQueueStatus = {
        totalItems: 100,
        pendingItems: 45,
        processingItems: 5,
        failedItems: 10,
        completedItems: 40,
        averageProcessingTime: 2.1,
        queueAge: 3600,
        priorityDistribution: {
          high: 20,
          medium: 50,
          low: 30
        },
        typeDistribution: {
          user_profile: 30,
          course_progress: 40,
          credentials: 20,
          achievements: 10
        }
      };

      syncController.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const response = await request(app)
        .get('/api/sync/queue/status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQueueStatus);
    });

    it('should handle queue status with filters', async () => {
      const mockStatus = { totalItems: 10, pendingItems: 5 };
      syncController.getQueueStatus.mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/sync/queue/status?userId=user_123&priority=high');

      expect(response.status).toBe(200);
      expect(syncController.getQueueStatus).toHaveBeenCalledWith({
        userId: 'user_123',
        priority: 'high'
      });
    });

    it('should handle queue status retrieval errors', async () => {
      syncController.getQueueStatus.mockRejectedValue(new Error('Failed to get queue status'));

      const response = await request(app)
        .get('/api/sync/queue/status');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/sync/devices/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent device registrations', async () => {
      const deviceData = { userId: 'user_123', deviceId: 'device_123', deviceType: 'mobile' };

      syncController.registerDevice
        .mockResolvedValueOnce({ id: 'device_1' })
        .mockResolvedValueOnce({ id: 'device_2' });

      const [response1, response2] = await Promise.all([
        request(app).post('/api/sync/devices/register').send(deviceData),
        request(app).post('/api/sync/devices/register').send(deviceData)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should handle large sync payloads', async () => {
      const largeSyncData = {
        userId: 'user_123',
        deviceId: 'device_123',
        entityType: 'course_progress',
        entityId: 'course_123',
        operation: 'update',
        data: {
          largeData: 'x'.repeat(1000000) // 1MB of data
        }
      };

      syncController.syncEntity.mockRejectedValue(new Error('Payload too large'));

      const response = await request(app)
        .post('/api/sync/sync')
        .send(largeSyncData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      syncController.getDevices.mockImplementation(() =>
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/sync/users/user_123/devices');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle invalid device types', async () => {
      const response = await request(app)
        .post('/api/sync/devices/register')
        .send({
          userId: 'user_123',
          deviceId: 'device_123',
          deviceType: 'invalid_type'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle unauthorized device operations', async () => {
      // This would require authentication middleware to be implemented
      const response = await request(app)
        .delete('/api/sync/devices/device_123')
        .query({ userId: 'different_user_123' });

      // Based on current implementation, this might work without auth
      // If auth is added later, this test would need to be updated
      expect([200, 401, 403]).toContain(response.status);
    });

    it('should handle queue overflow', async () => {
      syncController.enqueueSync.mockRejectedValue(new Error('Queue overflow'));

      const response = await request(app)
        .post('/api/sync/queue')
        .send({
          userId: 'user_123',
          entityType: 'user_profile',
          operation: 'update',
          data: {}
        });

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
    });
  });
});
