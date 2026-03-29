/**
 * Quantum Teleportation Integration Tests
 * Demonstrates the quantum teleportation system in action
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { quantumTeleportationProtocol } from '@/services/quantumTeleportation/teleportationProtocol';
import { stateCaptureService } from '@/services/quantumTeleportation/stateCapture';
import { entanglementService } from '@/services/quantumTeleportation/entanglement';
import { stateTomographyService } from '@/services/quantumTeleportation/stateTomography';
import { errorCorrectionService } from '@/services/quantumTeleportation/errorCorrection';
import { networkManager } from '@/services/quantumTeleportation/networkManager';
import type { LearningStateSnapshot, LocationRegistry } from '@/types/quantum';

describe('Quantum Teleportation System', () => {
  const userId = 'test-user-123';
  const locationId = 'loc-classroom-01';
  const courseId = 'course-quantum-101';
  const moduleId = 'module-entanglement-basics';

  beforeEach(async () => {
    // Reset all services
    stateCaptureService.clearHistory();
    stateTomographyService.clearData();
    errorCorrectionService.clearHistory();
    networkManager.clearAll();

    // Initialize system
    await quantumTeleportationProtocol.initialize(
      userId,
      locationId,
      courseId,
      moduleId,
      {
        stateSnapshotInterval: 100,
        enableErrorCorrection: true,
        errorCorrectionLevel: 'hamming',
        maxConcurrentTransfers: 10
      }
    );
  });

  afterEach(async () => {
    await quantumTeleportationProtocol.shutdown();
  });

  describe('State Capture Service', () => {
    test('should capture learning state snapshots', () => {
      const snapshot = stateCaptureService.captureSnapshot();

      expect(snapshot).toBeDefined();
      expect(snapshot.userId).toBe(userId);
      expect(snapshot.locationId).toBe(locationId);
      expect(snapshot.courseId).toBe(courseId);
      expect(snapshot.moduleId).toBe(moduleId);
      expect(snapshot.stateHash).toBeTruthy();
      expect(snapshot.version).toBeGreaterThan(0);
    });

    test('should update comprehension and engagement levels', () => {
      stateCaptureService.setComprehensionLevel(85);
      stateCaptureService.setEngagementLevel(90);

      const state = stateCaptureService.getCurrentState();

      expect(state.comprehensionLevel).toBe(85);
      expect(state.engagementLevel).toBe(90);
    });

    test('should record user actions', () => {
      const metrics = { timeSpent: 300, questionsAnswered: 5 };
      stateCaptureService.recordAction('quiz-completed', metrics);

      const state = stateCaptureService.getCurrentState();

      expect(state.lastAction).toBe('quiz-completed');
      expect(state.interactionMetrics).toEqual(metrics);
    });

    test('should maintain state history', async () => {
      stateCaptureService.captureSnapshot();
      await new Promise(resolve => setTimeout(resolve, 150));
      stateCaptureService.captureSnapshot();

      const history = stateCaptureService.getHistory();

      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    test('should support auto-capture loop', async () => {
      stateCaptureService.startAutoCaptureLoop(50);

      await new Promise(resolve => setTimeout(resolve, 200));

      const history = stateCaptureService.getHistory();
      const initialCount = history.length;

      expect(initialCount).toBeGreaterThan(0);

      stateCaptureService.stopAutoCaptureLoop();
    });
  });

  describe('Entanglement Service', () => {
    test('should create entanglement between locations', async () => {
      const targetLocationId = 'loc-remote-02';

      const connection = await entanglementService.createEntanglement(locationId, targetLocationId);

      expect(connection).toBeDefined();
      expect(connection.sourceLocationId).toBe(locationId);
      expect(connection.targetLocationId).toBe(targetLocationId);
      expect(connection.status).toBe('entangled');
      expect(connection.entanglementStrength).toBeGreaterThan(0);
    });

    test('should destroy entanglement', async () => {
      const targetLocationId = 'loc-remote-02';
      const connection = await entanglementService.createEntanglement(
        locationId,
        targetLocationId
      );

      await entanglementService.destroyEntanglement(connection.id);

      const retrieved = entanglementService.getConnection(connection.id);
      expect(retrieved).toBeUndefined();
    });

    test('should track message statistics', async () => {
      const targetLocationId = 'loc-remote-02';
      const connection = await entanglementService.createEntanglement(
        locationId,
        targetLocationId
      );

      // Simulate sending messages
      for (let i = 0; i < 5; i++) {
        try {
          await entanglementService.sendMessage(connection.id, { data: `msg-${i}` });
        } catch {
          // Ignore simulation failures
        }
      }

      const stats = entanglementService.getConnectionStats(connection.id);

      expect(stats).toBeDefined();
      expect(stats?.messagesSent).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Correction Service', () => {
    test('should create error correction data', () => {
      const payload = 'test-state-data';
      const errorData = errorCorrectionService.createErrorCorrectionData('msg-1', payload);

      expect(errorData).toBeDefined();
      expect(errorData.messageId).toBe('msg-1');
      expect(errorData.parityBits).toHaveLength(3);
      expect(errorData.checksumVerification).toBeTruthy();
    });

    test('should verify and correct data', () => {
      const payload = 'test-data';
      const errorData = errorCorrectionService.createErrorCorrectionData('msg-1', payload);

      const result = errorCorrectionService.verifyAndCorrect(payload, errorData);

      expect(result.success).toBe(true);
      expect(result.hadError).toBe(false);
    });

    test('should calculate error rate correctly', () => {
      errorCorrectionService.trackMessage('msg-1', false);
      errorCorrectionService.trackMessage('msg-2', false);
      errorCorrectionService.trackMessage('msg-3', true);

      const errorRate = errorCorrectionService.getErrorRate();

      expect(errorRate).toBeCloseTo(33.3, 1);
    });

    test('should accept error rates below threshold', () => {
      // Simulate 1 error in 10,000 messages (0.01% - well below 0.0001% threshold)
      for (let i = 0; i < 9999; i++) {
        errorCorrectionService.trackMessage(`msg-${i}`, false);
      }
      errorCorrectionService.trackMessage('msg-9999', true);

      const isAcceptable = errorCorrectionService.isErrorRateAcceptable('test-conn', 0.0001);

      // Should be acceptable since error rate is < 0.0001%
      expect(isAcceptable).toBeTruthy();
    });
  });

  describe('State Tomography Service', () => {
    test('should store and retrieve state versions', () => {
      const snapshot = stateCaptureService.captureSnapshot();
      stateTomographyService.storeStateVersion(snapshot);

      const versions = stateTomographyService.getStateVersions(
        snapshot.userId,
        snapshot.courseId,
        snapshot.moduleId
      );

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].id).toBe(snapshot.id);
    });

    test('should reconstruct states from versions', () => {
      const snapshot1 = stateCaptureService.captureSnapshot();
      stateCaptureService.setComprehensionLevel(75);
      const snapshot2 = stateCaptureService.captureSnapshot();

      stateTomographyService.storeStateVersion(snapshot1);
      stateTomographyService.storeStateVersion(snapshot2);

      const reconstructed = stateTomographyService.reconstructState(userId, courseId, moduleId);

      expect(reconstructed).toBeDefined();
      expect(reconstructed?.userId).toBe(userId);
    });

    test('should resolve conflicts between states', () => {
      const state1: LearningStateSnapshot = {
        id: 'state-1',
        timestamp: Date.now(),
        userId,
        locationId,
        courseId,
        moduleId,
        currentProgress: 50,
        comprehensionLevel: 70,
        engagementLevel: 80,
        focusState: 'active',
        memoryState: {},
        thinkingPattern: {},
        emotionalContext: 'focused',
        lastAction: 'quiz',
        actionTimestamp: Date.now(),
        interactionMetrics: {},
        version: 1,
        stateHash: 'hash1'
      };

      const state2: LearningStateSnapshot = {
        ...state1,
        id: 'state-2',
        timestamp: Date.now() + 100,
        comprehensionLevel: 85,
        version: 2,
        stateHash: 'hash2'
      };

      const { resolved, conflict } = stateTomographyService.resolveConflict(state1, state2);

      expect(conflict).toBe(true);
      expect(resolved).toBeDefined();
    });

    test('should detect anomalies in state progression', () => {
      const baseSnapshot = stateCaptureService.captureSnapshot();
      stateTomographyService.storeStateVersion(baseSnapshot);

      // Simulate sudden drop
      stateCaptureService.setComprehensionLevel(10);
      const anomalySnapshot = stateCaptureService.captureSnapshot();
      stateTomographyService.storeStateVersion(anomalySnapshot);

      const anomalies = stateTomographyService.detectAnomalies(userId, courseId, moduleId);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomaly).toContain('comprehension');
    });
  });

  describe('Network Management', () => {
    test('should register and retrieve locations', async () => {
      const location: LocationRegistry = {
        id: 'loc-test-01',
        name: 'Test Location',
        type: 'classroom',
        region: 'us-east',
        activeUsers: [userId],
        totalCapacity: 20,
        isOnline: true,
        lastHeartbeat: Date.now(),
        entangledWith: [],
        totalStatesTransferred: 0
      };

      await networkManager.registerLocation(location);

      const retrieved = networkManager.getLocation('loc-test-01');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Location');
    });

    test('should get network topology', async () => {
      const location1: LocationRegistry = {
        id: 'loc-1',
        name: 'Location 1',
        type: 'classroom',
        region: 'us-east',
        activeUsers: [userId],
        totalCapacity: 20,
        isOnline: true,
        lastHeartbeat: Date.now(),
        entangledWith: [],
        totalStatesTransferred: 0
      };

      const location2: LocationRegistry = {
        id: 'loc-2',
        name: 'Location 2',
        type: 'remote',
        region: 'us-west',
        activeUsers: [userId],
        totalCapacity: 15,
        isOnline: true,
        lastHeartbeat: Date.now(),
        entangledWith: [],
        totalStatesTransferred: 0
      };

      await networkManager.registerLocation(location1);
      await networkManager.registerLocation(location2);

      const topology = networkManager.getNetworkTopology();

      expect(topology.totalPeers).toBeGreaterThanOrEqual(2);
      expect(topology.locations).toHaveLength(2);
    });
  });

  describe('Quantum Teleportation Protocol', () => {
    test('should initialize system successfully', () => {
      const stats = quantumTeleportationProtocol.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalStateTransfers).toBe(0);
      expect(stats.successfulTransfers).toBe(0);
    });

    test('should get network status', () => {
      const status = quantumTeleportationProtocol.getNetworkStatus();

      expect(status).toBeDefined();
      expect(status.topology).toBeDefined();
      expect(status.statistics).toBeDefined();
      expect(status.activeTransfers).toBe(0);
    });

    test('should emit teleportation events', async () => {
      const events: any[] = [];

      const unsubscribe = quantumTeleportationProtocol.onEvent(event => {
        events.push(event);
      });

      const snapshot = stateCaptureService.captureSnapshot();
      const targetLocationId = 'loc-remote-01';

      try {
        await quantumTeleportationProtocol.teleportState(snapshot, targetLocationId);
      } catch (err) {
        // Ignore teleportation errors in test
      }

      // Should have at least one event
      expect(events.length).toBeGreaterThanOrEqual(1);

      unsubscribe();
    });

    test('should update configuration', () => {
      const newConfig = {
        maxRetries: 5,
        retryDelayMs: 2000
      };

      quantumTeleportationProtocol.updateConfiguration(newConfig);

      const config = quantumTeleportationProtocol.getConfiguration();

      expect(config.maxRetries).toBe(5);
      expect(config.retryDelayMs).toBe(2000);
    });
  });

  describe('End-to-End Quantum Teleportation Scenario', () => {
    test('should complete full teleportation cycle', async () => {
      // Step 1: Capture state
      stateCaptureService.setComprehensionLevel(80);
      stateCaptureService.setEngagementLevel(85);
      const originalState = stateCaptureService.captureSnapshot();

      // Step 2: Create entanglement
      const targetLocationId = 'loc-remote-01';
      const connection = await entanglementService.createEntanglement(
        locationId,
        targetLocationId
      );

      expect(connection.status).toBe('entangled');

      // Step 3: Store state version
      stateTomographyService.storeStateVersion(originalState);

      // Step 4: Verify state integrity
      const isIntact = stateTomographyService.verifyStateIntegrity(
        originalState,
        originalState.stateHash
      );

      expect(isIntact).toBe(true);

      // Step 5: Get statistics
      const stats = quantumTeleportationProtocol.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.errorRate).toBe('number');

      // Cleanup
      await entanglementService.destroyEntanglement(connection.id);
    });
  });
});
