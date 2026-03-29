const DifferentialPrivacy = require('../../src/services/federatedLearning/DifferentialPrivacy');

describe('DifferentialPrivacy', () => {
  let differentialPrivacy;

  beforeEach(() => {
    differentialPrivacy = new DifferentialPrivacy({
      epsilon: 1.0,
      delta: 1e-5,
      sensitivity: 1.0,
      mechanism: 'laplace'
    });
  });

  describe('Initialization', () => {
    test('should initialize with default configuration', () => {
      const dp = new DifferentialPrivacy();
      expect(dp.config.epsilon).toBe(1.0);
      expect(dp.config.delta).toBe(1e-5);
      expect(dp.config.sensitivity).toBe(1.0);
      expect(dp.config.mechanism).toBe('laplace');
    });

    test('should initialize with custom configuration', () => {
      const customDP = new DifferentialPrivacy({
        epsilon: 2.0,
        delta: 1e-6,
        sensitivity: 0.5,
        mechanism: 'gaussian'
      });

      expect(customDP.config.epsilon).toBe(2.0);
      expect(customDP.config.delta).toBe(1e-6);
      expect(customDP.config.sensitivity).toBe(0.5);
      expect(customDP.config.mechanism).toBe('gaussian');
    });

    test('should initialize privacy budget correctly', () => {
      expect(differentialPrivacy.privacyBudget).toBe(1.0);
      expect(differentialPrivacy.spentBudget).toBe(0);
      expect(differentialPrivacy.queryHistory).toEqual([]);
    });
  });

  describe('Laplace Mechanism', () => {
    test('should apply Laplace mechanism to numeric values', () => {
      const data = 10.0;
      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        sensitivity: 1.0,
        mechanism: 'laplace'
      });

      expect(typeof result).toBe('number');
      expect(result).not.toBe(data); // Should be different due to noise
      expect(isFinite(result)).toBe(true);
    });

    test('should apply Laplace mechanism to arrays', () => {
      const data = [1.0, 2.0, 3.0, 4.0, 5.0];
      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        sensitivity: 1.0,
        mechanism: 'laplace'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(5);
      expect(result).not.toEqual(data); // Should be different due to noise
      
      for (const value of result) {
        expect(isFinite(value)).toBe(true);
      }
    });

    test('should apply Laplace mechanism to objects', () => {
      const data = { weight1: 0.1, weight2: 0.2, weight3: 0.3 };
      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        sensitivity: 1.0,
        mechanism: 'laplace'
      });

      expect(typeof result).toBe('object');
      expect(Object.keys(result)).toEqual(Object.keys(data));
      expect(result).not.toEqual(data); // Should be different due to noise
      
      for (const value of Object.values(result)) {
        expect(isFinite(value)).toBe(true);
      }
    });

    test('should respect privacy budget', () => {
      const data = 10.0;
      
      // First query should succeed
      const result1 = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 0.5,
        mechanism: 'laplace'
      });
      expect(result1).toBeDefined();

      // Second query should also succeed (total epsilon = 1.0)
      const result2 = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 0.5,
        mechanism: 'laplace'
      });
      expect(result2).toBeDefined();

      // Third query should fail (would exceed budget)
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(data, {
          epsilon: 0.1,
          mechanism: 'laplace'
        });
      }).toThrow('Insufficient privacy budget');
    });
  });

  describe('Gaussian Mechanism', () => {
    test('should apply Gaussian mechanism', () => {
      const data = 10.0;
      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        delta: 1e-5,
        sensitivity: 1.0,
        mechanism: 'gaussian'
      });

      expect(typeof result).toBe('number');
      expect(result).not.toBe(data);
      expect(isFinite(result)).toBe(true);
    });

    test('should apply Gaussian mechanism to arrays', () => {
      const data = [1.0, 2.0, 3.0];
      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        delta: 1e-5,
        sensitivity: 1.0,
        mechanism: 'gaussian'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      
      for (const value of result) {
        expect(isFinite(value)).toBe(true);
      }
    });
  });

  describe('Exponential Mechanism', () => {
    test('should apply exponential mechanism', () => {
      const data = [1, 2, 3, 4, 5];
      const utilityFunction = (candidate, data) => {
        return Math.abs(candidate - data.reduce((a, b) => a + b) / data.length);
      };
      const candidates = [2, 3, 4];

      const result = differentialPrivacy.applyPrivacyMechanism(data, {
        epsilon: 1.0,
        mechanism: 'exponential',
        utilityFunction,
        candidates
      });

      expect(candidates).toContain(result);
    });

    test('should reject exponential mechanism without utility function', () => {
      const data = [1, 2, 3];
      
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(data, {
          epsilon: 1.0,
          mechanism: 'exponential'
        });
      }).toThrow('Exponential mechanism requires utility function and candidates');
    });

    test('should reject exponential mechanism without candidates', () => {
      const data = [1, 2, 3];
      const utilityFunction = () => 1;
      
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(data, {
          epsilon: 1.0,
          mechanism: 'exponential',
          utilityFunction
        });
      }).toThrow('Exponential mechanism requires utility function and candidates');
    });
  });

  describe('Gradient Privacy', () => {
    test('should privatize gradients with clipping and noise', () => {
      const gradients = {
        layer1: [2.0, 3.0, 4.0], // Values that will be clipped
        layer2: [0.1, 0.2, 0.3]  // Values that won't be clipped
      };

      const result = differentialPrivacy.privatizeGradients(gradients, {
        epsilon: 1.0,
        clipNorm: 1.0,
        mechanism: 'laplace'
      });

      expect(result).toHaveProperty('layer1');
      expect(result).toHaveProperty('layer2');
      expect(result.layer1).toHaveLength(3);
      expect(result.layer2).toHaveLength(3);

      // Check clipping
      for (const value of result.layer1) {
        expect(Math.abs(value)).toBeLessThanOrEqual(1.0);
      }

      // Check noise was added
      expect(result.layer1).not.toEqual([1.0, 1.0, 1.0]); // Clipped values + noise
      expect(result.layer2).not.toEqual([0.1, 0.2, 0.3]); // Original values + noise
    });

    test('should calculate gradient sensitivity correctly', () => {
      const gradients = {
        layer1: Array(100).fill(0.1),
        layer2: Array(50).fill(0.2)
      };

      const sensitivity = differentialPrivacy._calculateGradientSensitivity(gradients);
      expect(sensitivity).toBeGreaterThan(0);
      expect(sensitivity).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Weight Privacy', () => {
    test('should privatize model weights', () => {
      const weights = {
        dense1: [0.1, 0.2, 0.3, 0.4],
        dense2: [0.5, 0.6, 0.7, 0.8]
      };

      const result = differentialPrivacy.privatizeWeights(weights, {
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      expect(result).toHaveProperty('dense1');
      expect(result).toHaveProperty('dense2');
      expect(result.dense1).toHaveLength(4);
      expect(result.dense2).toHaveLength(4);
      expect(result).not.toEqual(weights); // Should have noise
    });

    test('should calculate weight sensitivity correctly', () => {
      const weights = {
        layer1: Array(100).fill(0.1),
        layer2: Array(200).fill(0.2),
        layer3: 0.5
      };

      const sensitivity = differentialPrivacy._calculateWeightSensitivity(weights);
      expect(sensitivity).toBeGreaterThan(0);
      expect(sensitivity).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Adaptive Budget Allocation', () => {
    test('should allocate budget adaptively based on priority', () => {
      const tasks = [
        { id: 'task1', priority: 1.0 },
        { id: 'task2', priority: 0.8 },
        { id: 'task3', priority: 0.6 },
        { id: 'task4', priority: 0.4 },
        { id: 'task5', priority: 0.2 }
      ];

      const allocated = differentialPrivacy.adaptiveBudgetAllocation(tasks);

      expect(allocated).toHaveLength(5);
      expect(allocated[0].allocatedEpsilon).toBeGreaterThan(allocated[4].allocatedEpsilon);
      
      // Total should not exceed available budget
      const totalAllocated = allocated.reduce((sum, task) => sum + task.allocatedEpsilon, 0);
      expect(totalAllocated).toBeLessThanOrEqual(differentialPrivacy.privacyBudget);
    });

    test('should handle equal priority tasks', () => {
      const tasks = [
        { id: 'task1', priority: 0.5 },
        { id: 'task2', priority: 0.5 },
        { id: 'task3', priority: 0.5 }
      ];

      const allocated = differentialPrivacy.adaptiveBudgetAllocation(tasks);
      
      expect(allocated).toHaveLength(3);
      // Should distribute roughly equally
      const epsilonValues = allocated.map(t => t.allocatedEpsilon);
      const maxEpsilon = Math.max(...epsilonValues);
      const minEpsilon = Math.min(...epsilonValues);
      expect(maxEpsilon - minEpsilon).toBeLessThan(0.1);
    });
  });

  describe('Privacy Composition', () => {
    test('should compose privacy guarantees correctly', () => {
      const queries = [
        { epsilon: 0.3, delta: 1e-6 },
        { epsilon: 0.2, delta: 1e-6 },
        { epsilon: 0.4, delta: 1e-6 }
      ];

      const composition = differentialPrivacy.composePrivacyGuarantees(queries);

      expect(composition.totalEpsilon).toBe(0.9);
      expect(composition.totalDelta).toBe(3e-6);
      expect(composition.remainingBudget).toBe(0.1);
      expect(composition.budgetExhausted).toBe(false);
    });

    test('should detect budget exhaustion', () => {
      const queries = [
        { epsilon: 0.6, delta: 1e-6 },
        { epsilon: 0.5, delta: 1e-6 }
      ];

      const composition = differentialPrivacy.composePrivacyGuarantees(queries);

      expect(composition.totalEpsilon).toBe(1.1);
      expect(composition.remainingBudget).toBe(0);
      expect(composition.budgetExhausted).toBe(true);
    });
  });

  describe('Local Differential Privacy', () => {
    test('should apply local Laplace mechanism', () => {
      const data = 10.0;
      const result = differentialPrivacy.localDifferentialPrivacy(data, {
        epsilon: 1.0,
        mechanism: 'laplace'
      });

      expect(typeof result).toBe('number');
      expect(result).not.toBe(data);
      expect(isFinite(result)).toBe(true);
    });

    test('should apply randomized response for boolean data', () => {
      const data = true;
      const result = differentialPrivacy.localDifferentialPrivacy(data, {
        epsilon: 1.0,
        mechanism: 'randomized_response',
        probability: 0.8
      });

      expect(typeof result).toBe('boolean');
    });

    test('should apply randomized response for categorical data', () => {
      const data = 'category1';
      const result = differentialPrivacy.localDifferentialPrivacy(data, {
        epsilon: 1.0,
        mechanism: 'randomized_response',
        categories: ['category1', 'category2', 'category3'],
        probability: 0.8
      });

      expect(['category1', 'category2', 'category3']).toContain(result);
    });

    test('should apply Harmony mechanism', () => {
      const data = [1.0, 2.0, 3.0, 4.0];
      const result = differentialPrivacy.localDifferentialPrivacy(data, {
        epsilon: 1.0,
        mechanism: 'harmony'
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4);
    });
  });

  describe('RAPPOR', () => {
    test('should apply RAPPOR to boolean data', () => {
      const data = true;
      const result = differentialPrivacy.applyRAPPOR(data, {
        probabilityF: 0.5,
        probabilityP: 0.75,
        probabilityQ: 0.25,
        probabilityG: 0.5
      });

      expect(typeof result).toBe('boolean');
    });

    test('should apply RAPPOR to numeric data', () => {
      const data = 1;
      const result = differentialPrivacy.applyRAPPOR(data);

      expect(typeof result).toBe('boolean');
    });

    test('should reject invalid data types for RAPPOR', () => {
      expect(() => {
        differentialPrivacy.applyRAPPOR('invalid');
      }).toThrow('RAPPOR requires boolean or numeric data');

      expect(() => {
        differentialPrivacy.applyRAPPOR({});
      }).toThrow('RAPPOR requires boolean or numeric data');
    });
  });

  describe('Budget Management', () => {
    test('should track budget usage correctly', () => {
      const initialBudget = differentialPrivacy.getBudgetStatus();
      expect(initialBudget.spentBudget).toBe(0);

      differentialPrivacy.applyPrivacyMechanism(10.0, { epsilon: 0.3 });
      const afterQuery = differentialPrivacy.getBudgetStatus();
      expect(afterQuery.spentBudget).toBe(0.3);

      differentialPrivacy.applyPrivacyMechanism(20.0, { epsilon: 0.2 });
      const afterSecondQuery = differentialPrivacy.getBudgetStatus();
      expect(afterSecondQuery.spentBudget).toBe(0.5);
    });

    test('should reset budget correctly', () => {
      differentialPrivacy.applyPrivacyMechanism(10.0, { epsilon: 0.5 });
      expect(differentialPrivacy.spentBudget).toBe(0.5);

      differentialPrivacy.resetBudget();
      expect(differentialPrivacy.spentBudget).toBe(0);
      expect(differentialPrivacy.queryHistory).toEqual([]);
    });

    test('should reset budget with custom value', () => {
      differentialPrivacy.resetBudget(2.0);
      expect(differentialPrivacy.privacyBudget).toBe(2.0);
      expect(differentialPrivacy.spentBudget).toBe(0);
    });
  });

  describe('Privacy Reporting', () => {
    test('should generate privacy report', () => {
      // Perform some queries
      differentialPrivacy.applyPrivacyMechanism(10.0, { 
        epsilon: 0.3, 
        mechanism: 'laplace',
        type: 'test' 
      });
      differentialPrivacy.applyPrivacyMechanism(20.0, { 
        epsilon: 0.2, 
        mechanism: 'gaussian',
        type: 'test' 
      });

      const report = differentialPrivacy.getPrivacyReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('mechanismUsage');
      expect(report).toHaveProperty('averageEpsilonPerQuery');
      expect(report).toHaveProperty('recentQueries');
      expect(report).toHaveProperty('complianceStatus');

      expect(report.summary.spentBudget).toBe(0.5);
      expect(report.mechanismUsage.laplace).toBe(1);
      expect(report.mechanismUsage.gaussian).toBe(1);
      expect(report.averageEpsilonPerQuery).toBe(0.25);
      expect(report.complianceStatus).toBe('compliant');
    });

    test('should detect compliance violations', () => {
      // Exhaust the budget
      differentialPrivacy.applyPrivacyMechanism(10.0, { epsilon: 1.0 });

      const report = differentialPrivacy.getPrivacyReport();
      expect(report.complianceStatus).toBe('compliant');

      // Try to exceed budget (this will throw, but we check the report after)
      try {
        differentialPrivacy.applyPrivacyMechanism(20.0, { epsilon: 0.1 });
      } catch (e) {
        // Expected to throw
      }

      const finalReport = differentialPrivacy.getPrivacyReport();
      expect(finalReport.summary.spentBudget).toBe(1.0);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown mechanisms gracefully', () => {
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(10.0, {
          epsilon: 1.0,
          mechanism: 'unknown'
        });
      }).toThrow('Unknown privacy mechanism: unknown');
    });

    test('should handle invalid data gracefully', () => {
      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(null, {
          epsilon: 1.0,
          mechanism: 'laplace'
        });
      }).not.toThrow();

      expect(() => {
        differentialPrivacy.applyPrivacyMechanism(undefined, {
          epsilon: 1.0,
          mechanism: 'laplace'
        });
      }).not.toThrow();
    });

    test('should handle local DP errors gracefully', () => {
      expect(() => {
        differentialPrivacy.localDifferentialPrivacy(10.0, {
          epsilon: 1.0,
          mechanism: 'unknown'
        });
      }).toThrow('Unknown local DP mechanism: unknown');
    });
  });

  describe('Performance', () => {
    test('should handle large datasets efficiently', () => {
      const largeData = Array(10000).fill(0).map(() => Math.random());

      const startTime = Date.now();
      const result = differentialPrivacy.applyPrivacyMechanism(largeData, {
        epsilon: 1.0,
        mechanism: 'laplace'
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result).toHaveLength(10000);
    });

    test('should handle high-dimensional objects efficiently', () => {
      const largeObject = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`feature${i}`] = Math.random();
      }

      const startTime = Date.now();
      const result = differentialPrivacy.applyPrivacyMechanism(largeObject, {
        epsilon: 1.0,
        mechanism: 'laplace'
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(Object.keys(result)).toHaveLength(1000);
    });
  });
});
