const FederatedLearningCoordinator = require('../../src/services/federatedLearning/FederatedLearningCoordinator');

describe('FederatedLearningCoordinator', () => {
  let coordinator;

  beforeEach(() => {
    coordinator = new FederatedLearningCoordinator({
      minParticipants: 2,
      maxParticipants: 10,
      aggregationRounds: 3,
      privacyBudget: 2.0
    });
  });

  afterEach(() => {
    if (coordinator) {
      coordinator.removeAllListeners();
    }
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const defaultCoordinator = new FederatedLearningCoordinator();
      expect(defaultCoordinator.config.minParticipants).toBe(3);
      expect(defaultCoordinator.config.maxParticipants).toBe(100);
      expect(defaultCoordinator.config.aggregationRounds).toBe(10);
    });

    test('should initialize with custom configuration', () => {
      expect(coordinator.config.minParticipants).toBe(2);
      expect(coordinator.config.maxParticipants).toBe(10);
      expect(coordinator.config.aggregationRounds).toBe(3);
    });

    test('should initialize session successfully', async () => {
      const modelArchitecture = {
        layers: [
          { name: 'dense1', size: 128 },
          { name: 'dense2', size: 64 }
        ]
      };

      const sessionId = await coordinator.initializeSession(modelArchitecture);
      
      expect(sessionId).toBeDefined();
      expect(coordinator.globalModel).toBeDefined();
      expect(coordinator.globalModel.id).toBe(sessionId);
      expect(coordinator.globalModel.architecture).toEqual(modelArchitecture);
      expect(coordinator.globalModel.version).toBe(0);
    });
  });

  describe('Participant Management', () => {
    beforeEach(async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);
    });

    test('should register participant successfully', async () => {
      const participantInfo = {
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'public-key-123',
        dataInfo: {
          features: 1000,
          samples: 10000,
          dataType: 'student_performance'
        },
        reputation: 0.9
      };

      const participantId = await coordinator.registerParticipant(participantInfo);
      
      expect(participantId).toBeDefined();
      expect(coordinator.participants.has(participantId)).toBe(true);
      
      const participant = coordinator.participants.get(participantId);
      expect(participant.institutionId).toBe('university-1');
      expect(participant.status).toBe('registered');
    });

    test('should reject invalid participant information', async () => {
      const invalidParticipant = {
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com'
        // Missing required fields
      };

      await expect(coordinator.registerParticipant(invalidParticipant))
        .rejects.toThrow('Invalid participant information');
    });

    test('should handle multiple participants', async () => {
      const participants = [
        {
          institutionId: 'university-1',
          endpoint: 'https://university1.example.com',
          publicKey: 'key1',
          dataInfo: { features: 1000, samples: 10000 }
        },
        {
          institutionId: 'university-2',
          endpoint: 'https://university2.example.com',
          publicKey: 'key2',
          dataInfo: { features: 800, samples: 8000 }
        }
      ];

      const participantIds = await Promise.all(
        participants.map(p => coordinator.registerParticipant(p))
      );

      expect(participantIds).toHaveLength(2);
      expect(coordinator.participants.size).toBe(2);
    });
  });

  describe('Round Management', () => {
    beforeEach(async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      // Register minimum participants
      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.registerParticipant({
        institutionId: 'university-2',
        endpoint: 'https://university2.example.com',
        publicKey: 'key2',
        dataInfo: { features: 800, samples: 8000 }
      });
    });

    test('should start round successfully', async () => {
      const round = await coordinator.startRound();
      
      expect(round).toBeDefined();
      expect(round.status).toBe('active');
      expect(round.participants.size).toBe(0);
      expect(coordinator.currentRound).toBe(1);
      expect(coordinator.activeRound).toBeDefined();
    });

    test('should reject round start with insufficient participants', async () => {
      // Remove one participant
      coordinator.participants.clear();
      
      await expect(coordinator.startRound())
        .rejects.toThrow('Insufficient participants');
    });

    test('should receive model updates', async () => {
      await coordinator.startRound();
      
      const participantIds = Array.from(coordinator.participants.keys());
      const updateData = {
        weights: { dense1: Array(128).fill(0).map(() => Math.random() * 0.1) },
        dataSize: 1000,
        accuracy: 0.85,
        loss: 0.3
      };

      const result = await coordinator.receiveModelUpdate(participantIds[0], updateData);
      
      expect(result.status).toBe('received');
      expect(coordinator.activeRound.participants.has(participantIds[0])).toBe(true);
      expect(coordinator.activeRound.modelUpdates.has(participantIds[0])).toBe(true);
    });

    test('should complete round after minimum updates', async () => {
      await coordinator.startRound();
      
      const participantIds = Array.from(coordinator.participants.keys());
      const updateData = {
        weights: { dense1: Array(128).fill(0).map(() => Math.random() * 0.1) },
        dataSize: 1000
      };

      // Send updates from both participants
      await coordinator.receiveModelUpdate(participantIds[0], updateData);
      await coordinator.receiveModelUpdate(participantIds[1], updateData);

      // Round should complete automatically
      expect(coordinator.activeRound).toBeNull();
      expect(coordinator.globalModel.version).toBe(1);
      expect(coordinator.aggregationHistory).toHaveLength(1);
    });

    test('should reject updates when no active round', async () => {
      const participantIds = Array.from(coordinator.participants.keys());
      const updateData = {
        weights: { dense1: Array(128).fill(0.1) },
        dataSize: 1000
      };

      await expect(coordinator.receiveModelUpdate(participantIds[0], updateData))
        .rejects.toThrow('No active round');
    });
  });

  describe('Model Aggregation', () => {
    beforeEach(async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 4 }] // Small size for testing
      };
      await coordinator.initializeSession(modelArchitecture);

      // Register participants
      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.registerParticipant({
        institutionId: 'university-2',
        endpoint: 'https://university2.example.com',
        publicKey: 'key2',
        dataInfo: { features: 800, samples: 8000 }
      });
    });

    test('should perform federated averaging', async () => {
      await coordinator.startRound({ aggregationMethod: 'fedavg' });
      
      const participantIds = Array.from(coordinator.participants.keys());
      
      // Send updates with different weights
      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: { dense1: [0.1, 0.2, 0.3, 0.4] },
        dataSize: 1000
      });

      await coordinator.receiveModelUpdate(participantIds[1], {
        weights: { dense1: [0.2, 0.3, 0.4, 0.5] },
        dataSize: 2000
      });

      // Check aggregated weights (weighted average)
      const aggregatedWeights = coordinator.globalModel.weights.dense1;
      expect(aggregatedWeights).toHaveLength(4);
      
      // First weight: (0.1*1000 + 0.2*2000) / 3000 = 0.1667
      expect(aggregatedWeights[0]).toBeCloseTo(0.1667, 3);
    });

    test('should perform weighted aggregation', async () => {
      await coordinator.startRound({ aggregationMethod: 'weighted' });
      
      const participantIds = Array.from(coordinator.participants.keys());
      
      // Update participant reputations
      coordinator.participants.get(participantIds[0]).reputation = 0.8;
      coordinator.participants.get(participantIds[1]).reputation = 0.6;

      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: { dense1: [0.1, 0.2, 0.3, 0.4] },
        dataSize: 1000
      });

      await coordinator.receiveModelUpdate(participantIds[1], {
        weights: { dense1: [0.2, 0.3, 0.4, 0.5] },
        dataSize: 2000
      });

      // Check weighted aggregation based on reputation
      const aggregatedWeights = coordinator.globalModel.weights.dense1;
      expect(aggregatedWeights).toHaveLength(4);
    });
  });

  describe('Differential Privacy', () => {
    beforeEach(async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 4 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.registerParticipant({
        institutionId: 'university-2',
        endpoint: 'https://university2.example.com',
        publicKey: 'key2',
        dataInfo: { features: 800, samples: 8000 }
      });
    });

    test('should apply differential privacy noise', async () => {
      await coordinator.startRound({
        epsilon: 1.0,
        delta: 1e-5,
        clipNorm: 1.0
      });

      const participantIds = Array.from(coordinator.participants.keys());
      const originalWeights = { dense1: [0.1, 0.2, 0.3, 0.4] };

      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: originalWeights,
        dataSize: 1000
      });

      const update = coordinator.activeRound.modelUpdates.get(participantIds[0]);
      const noisyWeights = update.update.weights.dense1;

      // Weights should be different due to noise
      expect(noisyWeights).not.toEqual(originalWeights);
      
      // But should be within reasonable bounds (clipped + noise)
      for (const weight of noisyWeights) {
        expect(Math.abs(weight)).toBeLessThan(2.0); // Clip norm + reasonable noise
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 4 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.registerParticipant({
        institutionId: 'university-2',
        endpoint: 'https://university2.example.com',
        publicKey: 'key2',
        dataInfo: { features: 800, samples: 8000 }
      });
    });

    test('should provide session statistics', () => {
      const stats = coordinator.getSessionStats();

      expect(stats.participants).toBe(2);
      expect(stats.currentRound).toBe(0);
      expect(stats.activeRound).toBe('none');
      expect(stats.modelVersion).toBe(0);
      expect(stats.aggregationHistory).toEqual([]);
    });

    test('should track privacy budget usage', async () => {
      await coordinator.startRound({ epsilon: 0.5 });
      
      const participantIds = Array.from(coordinator.participants.keys());
      
      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: { dense1: [0.1, 0.2, 0.3, 0.4] },
        dataSize: 1000
      });

      await coordinator.receiveModelUpdate(participantIds[1], {
        weights: { dense1: [0.2, 0.3, 0.4, 0.5] },
        dataSize: 2000
      });

      const stats = coordinator.getSessionStats();
      expect(stats.privacyBudgetUsed).toBe(0.5);
    });

    test('should maintain model history', async () => {
      const initialVersion = coordinator.getModelHistory();
      expect(initialVersion).toHaveLength(1);

      await coordinator.startRound();
      
      const participantIds = Array.from(coordinator.participants.keys());
      
      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: { dense1: [0.1, 0.2, 0.3, 0.4] },
        dataSize: 1000
      });

      await coordinator.receiveModelUpdate(participantIds[1], {
        weights: { dense1: [0.2, 0.3, 0.4, 0.5] },
        dataSize: 2000
      });

      const history = coordinator.getModelHistory();
      expect(history).toHaveLength(2);
      expect(history[1].version).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid model architecture', async () => {
      const invalidArchitecture = null;
      
      await expect(coordinator.initializeSession(invalidArchitecture))
        .rejects.toThrow();
    });

    test('should handle unknown participant in update', async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);
      await coordinator.startRound();

      await expect(coordinator.receiveModelUpdate('unknown-participant', {
        weights: { dense1: [0.1] },
        dataSize: 1000
      })).rejects.toThrow('Unknown participant');
    });

    test('should handle malformed update data', async () => {
      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.startRound();
      
      const participantIds = Array.from(coordinator.participants.keys());

      // This should not throw but handle gracefully
      const result = await coordinator.receiveModelUpdate(participantIds[0], {
        // Missing weights
        dataSize: 1000
      });

      expect(result.status).toBe('received');
    });
  });

  describe('Event Emission', () => {
    test('should emit events for session lifecycle', async () => {
      const sessionInitializedSpy = jest.fn();
      coordinator.on('sessionInitialized', sessionInitializedSpy);

      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      expect(sessionInitializedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: expect.any(String),
          model: expect.any(Object)
        })
      );
    });

    test('should emit events for participant lifecycle', async () => {
      const participantRegisteredSpy = jest.fn();
      coordinator.on('participantRegistered', participantRegisteredSpy);

      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 128 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      const participantInfo = {
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      };

      await coordinator.registerParticipant(participantInfo);

      expect(participantRegisteredSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          institutionId: 'university-1'
        })
      );
    });

    test('should emit events for round lifecycle', async () => {
      const roundStartedSpy = jest.fn();
      const roundCompletedSpy = jest.fn();
      coordinator.on('roundStarted', roundStartedSpy);
      coordinator.on('roundCompleted', roundCompletedSpy);

      const modelArchitecture = {
        layers: [{ name: 'dense1', size: 4 }]
      };
      await coordinator.initializeSession(modelArchitecture);

      await coordinator.registerParticipant({
        institutionId: 'university-1',
        endpoint: 'https://university1.example.com',
        publicKey: 'key1',
        dataInfo: { features: 1000, samples: 10000 }
      });

      await coordinator.registerParticipant({
        institutionId: 'university-2',
        endpoint: 'https://university2.example.com',
        publicKey: 'key2',
        dataInfo: { features: 800, samples: 8000 }
      });

      await coordinator.startRound();
      expect(roundStartedSpy).toHaveBeenCalled();

      const participantIds = Array.from(coordinator.participants.keys());
      
      await coordinator.receiveModelUpdate(participantIds[0], {
        weights: { dense1: [0.1, 0.2, 0.3, 0.4] },
        dataSize: 1000
      });

      await coordinator.receiveModelUpdate(participantIds[1], {
        weights: { dense1: [0.2, 0.3, 0.4, 0.5] },
        dataSize: 2000
      });

      expect(roundCompletedSpy).toHaveBeenCalled();
    });
  });
});
