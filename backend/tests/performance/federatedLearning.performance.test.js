const { FederatedLearningCoordinator } = require('../../src/services/federatedLearning/FederatedLearningCoordinator');
const { SecureAggregation } = require('../../src/services/federatedLearning/SecureAggregation');
const { DifferentialPrivacy } = require('../../src/services/federatedLearning/DifferentialPrivacy');

describe('Federated Learning Performance Tests', () => {
  let coordinator;
  let secureAggregation;
  let differentialPrivacy;

  beforeEach(() => {
    coordinator = new FederatedLearningCoordinator({
      minParticipants: 3,
      maxParticipants: 50,
      aggregationRounds: 5,
      privacyBudget: 2.0
    });

    secureAggregation = new SecureAggregation({
      keySize: 1024 // Smaller key size for faster tests
    });

    differentialPrivacy = new DifferentialPrivacy({
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0
    });
  });

  describe('FederatedLearningCoordinator Performance', () => {
    test('should handle session initialization within time limit', async () => {
      const startTime = performance.now();
      
      const modelArchitecture = {
        layers: [
          { name: 'dense1', size: 128 },
          { name: 'dense2', size: 64 },
          { name: 'output', size: 1 }
        ]
      };

      await coordinator.initializeSession(modelArchitecture);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(coordinator.globalModel).toBeDefined();
    });

    test('should handle multiple participants concurrently', async () => {
      const participantCount = 20;
      const startTime = performance.now();

      // Register multiple participants concurrently
      const participantPromises = Array(participantCount).fill().map((_, index) => 
        coordinator.registerParticipant({
          id: `participant-${index}`,
          institutionName: `Institution ${index}`,
          capabilities: {
            maxModelSize: '1GB',
            supportedFrameworks: ['tensorflow']
          }
        })
      );

      await Promise.all(participantPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(coordinator.participants.size).toBe(participantCount);
    });

    test('should handle model aggregation efficiently', async () => {
      // Initialize session and participants
      await coordinator.initializeSession({
        layers: [{ name: 'dense1', size: 100 }]
      });

      // Register participants
      for (let i = 0; i < 5; i++) {
        await coordinator.registerParticipant({
          id: `participant-${i}`,
          institutionName: `Institution ${i}`
        });
      }

      // Generate mock model updates
      const modelUpdates = Array(5).fill().map((_, index) => ({
        participantId: `participant-${index}`,
        weights: Array(100).fill().map(() => Math.random()),
        metadata: {
          accuracy: 0.8 + Math.random() * 0.2,
          trainingSamples: 1000
        }
      }));

      const startTime = performance.now();
      
      await coordinator.aggregateModelUpdates(modelUpdates);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
      expect(coordinator.globalModel.version).toBe(1);
    });
  });

  describe('SecureAggregation Performance', () => {
    test('should initialize keys within reasonable time', async () => {
      const startTime = performance.now();
      
      await secureAggregation.initializeKeys();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(secureAggregation.publicKey).toBeDefined();
      expect(secureAggregation.privateKey).toBeDefined();
    });

    test('should handle secret sharing efficiently', () => {
      const participantCount = 10;
      const threshold = 3;
      const value = 12345;

      const startTime = performance.now();
      
      const shares = secureAggregation.generateSecretShares(value, participantCount, threshold);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(shares.length).toBe(participantCount);
    });

    test('should handle homomorphic encryption operations', async () => {
      await secureAggregation.initializeKeys();
      
      const values = [100, 200, 300, 400, 500];
      const startTime = performance.now();

      // Encrypt values
      const encryptedValues = values.map(value => 
        secureAggregation.publicKey.encrypt(BigInt(value))
      );

      // Aggregate encrypted values
      let aggregated = encryptedValues[0];
      for (let i = 1; i < encryptedValues.length; i++) {
        aggregated = secureAggregation.publicKey.addition(aggregated, encryptedValues[i]);
      }

      // Decrypt result
      const result = secureAggregation.privateKey.decrypt(aggregated);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(Number(result)).toBe(values.reduce((sum, val) => sum + val, 0));
    });
  });

  describe('DifferentialPrivacy Performance', () => {
    test('should apply Laplace mechanism efficiently', () => {
      const data = [1, 2, 3, 4, 5];
      const startTime = performance.now();

      const noisyData = data.map(value =>
        differentialPrivacy.applyPrivacyMechanism(value, {
          epsilon: 1.0,
          sensitivity: 1.0,
          mechanism: 'laplace'
        })
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should complete within 50ms
      expect(noisyData.length).toBe(data.length);
      
      // Noisy data should be different from original (privacy applied)
      let isDifferent = false;
      for (let i = 0; i < data.length; i++) {
        if (noisyData[i] !== data[i]) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });

    test('should handle multiple queries efficiently', () => {
      const queryCount = 100;
      const startTime = performance.now();

      const results = Array(queryCount).fill().map((_, index) =>
        differentialPrivacy.applyPrivacyMechanism(index, {
          epsilon: 0.1, // Small epsilon per query
          sensitivity: 1.0
        })
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete within 200ms
      expect(results.length).toBe(queryCount);
    });

    test('should enforce privacy budget correctly', () => {
      const epsilon = 1.0;
      const queryCount = 5;
      const epsilonPerQuery = epsilon / queryCount;

      // Execute queries that should exhaust the budget
      for (let i = 0; i < queryCount - 1; i++) {
        expect(() => {
          differentialPrivacy.applyPrivacyMechanism(i, {
            epsilon: epsilonPerQuery,
            sensitivity: 1.0
          });
        }).not.toThrow();
      }

      // Last query should exceed budget
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(queryCount, {
          epsilon: epsilonPerQuery,
          sensitivity: 1.0
        });
      }).toThrow('Insufficient privacy budget');
    });
  });

  describe('End-to-End Performance', () => {
    test('should complete full federated learning round within time limit', async () => {
      const startTime = performance.now();

      // Initialize session
      await coordinator.initializeSession({
        layers: [{ name: 'dense1', size: 50 }]
      });

      // Initialize secure aggregation
      await secureAggregation.initializeKeys();

      // Register participants
      const participantCount = 5;
      for (let i = 0; i < participantCount; i++) {
        await coordinator.registerParticipant({
          id: `participant-${i}`,
          institutionName: `Institution ${i}`
        });
      }

      // Simulate training round
      const modelUpdates = Array(participantCount).fill().map((_, index) => {
        const weights = Array(50).fill().map(() => Math.random());
        
        // Apply differential privacy
        const privateWeights = weights.map(weight =>
          differentialPrivacy.applyPrivacyMechanism(weight, {
            epsilon: 0.5,
            sensitivity: 1.0
          })
        );

        return {
          participantId: `participant-${index}`,
          weights: privateWeights,
          metadata: {
            accuracy: 0.8 + Math.random() * 0.2,
            trainingSamples: 1000
          }
        };
      });

      // Aggregate updates
      await coordinator.aggregateModelUpdates(modelUpdates);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(coordinator.globalModel.version).toBe(1);
    });

    test('should handle concurrent federated learning sessions', async () => {
      const sessionCount = 3;
      const startTime = performance.now();

      // Create multiple sessions concurrently
      const sessionPromises = Array(sessionCount).fill().map((_, index) => {
        const sessionCoordinator = new FederatedLearningCoordinator();
        return sessionCoordinator.initializeSession({
          layers: [{ name: `dense${index}`, size: 25 }]
        });
      });

      const sessionIds = await Promise.all(sessionPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(sessionIds.length).toBe(sessionCount);
    });
  });

  describe('Memory Usage', () => {
    test('should not leak memory during multiple operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple operations
      for (let i = 0; i < 50; i++) {
        const sessionCoordinator = new FederatedLearningCoordinator();
        await sessionCoordinator.initializeSession({
          layers: [{ name: 'dense1', size: 10 }]
        });
        
        // Register participants
        for (let j = 0; j < 3; j++) {
          await sessionCoordinator.registerParticipant({
            id: `participant-${i}-${j}`,
            institutionName: `Institution ${i}-${j}`
          });
        }
        
        // Clear references
        sessionCoordinator.removeAllListeners();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Scalability Tests', () => {
    test('should handle large number of participants', async () => {
      const participantCount = 100;
      const startTime = performance.now();

      // Initialize session
      await coordinator.initializeSession({
        layers: [{ name: 'dense1', size: 10 }]
      });

      // Register many participants
      const participantPromises = Array(participantCount).fill().map((_, index) =>
        coordinator.registerParticipant({
          id: `participant-${index}`,
          institutionName: `Institution ${index}`
        })
      );

      await Promise.all(participantPromises);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(coordinator.participants.size).toBe(participantCount);
    });

    test('should handle large model weights', async () => {
      const modelSize = 10000; // 10k parameters
      const startTime = performance.now();

      // Initialize session with large model
      await coordinator.initializeSession({
        layers: [{ name: 'dense1', size: modelSize }]
      });

      // Generate large model update
      const largeWeights = Array(modelSize).fill().map(() => Math.random());
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(coordinator.globalModel.weights.length).toBe(modelSize);
    });
  });
});
