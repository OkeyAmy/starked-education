/**
 * Quantum Computing Tests
 * Comprehensive test suite for quantum computing features
 */

const request = require('supertest');
const app = require('../index');
const { quantumServices } = require('../services/quantumServices');

describe('Quantum Computing API', () => {
  describe('Health Check', () => {
    test('should return quantum service health status', async () => {
      const response = await request(app)
        .get('/api/quantum/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('services');
    });
  });

  describe('Quantum Algorithm Integration', () => {
    test('should get available quantum providers', async () => {
      const response = await request(app)
        .get('/api/quantum/providers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('providers');
      expect(Array.isArray(response.body.data.providers)).toBe(true);
    });

    test('should connect to quantum provider', async () => {
      const response = await request(app)
        .post('/api/quantum/providers/connect')
        .send({
          provider: 'ibmq',
          config: {
            provider: 'ibmq',
            backend_name: 'ibmq_quito',
            num_qubits: 5,
            shots: 1024
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Successfully connected');
    });

    test('should execute quantum circuit', async () => {
      const response = await request(app)
        .post('/api/quantum/execute')
        .send({
          circuit: {
            num_qubits: 2,
            gates: [
              { name: 'h', qubits: [0] },
              { name: 'cx', qubits: [0, 1] }
            ]
          },
          shots: 1024,
          provider: 'ibmq'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('job_id');
      expect(response.body.data).toHaveProperty('counts');
    });
  });

  describe('Quantum Optimization', () => {
    test('should get available optimizers', async () => {
      const response = await request(app)
        .get('/api/quantum/optimization/optimizers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('optimizers');
      expect(Array.isArray(response.body.data.optimizers)).toBe(true);
    });

    test('should solve optimization problem', async () => {
      const response = await request(app)
        .post('/api/quantum/optimization/solve')
        .send({
          problem: {
            problem_id: 'test_maxcut',
            problem_type: 'maxcut',
            variables: 4,
            constraints: [],
            objective_matrix: [
              [0, 1, 1, 0],
              [1, 0, 1, 1],
              [1, 1, 0, 1],
              [0, 1, 1, 0]
            ]
          },
          optimizer_name: 'qaoa'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('solution');
      expect(response.body.data).toHaveProperty('objective_value');
      expect(Array.isArray(response.body.data.solution)).toBe(true);
    });

    test('should compare optimizers', async () => {
      const response = await request(app)
        .post('/api/quantum/optimization/compare')
        .send({
          problem: {
            problem_id: 'test_compare',
            problem_type: 'maxcut',
            variables: 3,
            constraints: [],
            objective_matrix: [
              [0, 1, 1],
              [1, 0, 1],
              [1, 1, 0]
            ]
          },
          optimizer_names: ['qaoa', 'vqe']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(typeof response.body.data).toBe('object');
    });
  });

  describe('Quantum Machine Learning', () => {
    test('should get available ML algorithms', async () => {
      const response = await request(app)
        .get('/api/quantum/ml/algorithms')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('algorithms');
      expect(Array.isArray(response.body.data.algorithms)).toBe(true);
    });

    test('should create ML model', async () => {
      const response = await request(app)
        .post('/api/quantum/ml/models')
        .send({
          model_id: 'test_qnn_model',
          model_type: 'classification',
          architecture: 'qnn',
          num_qubits: 4,
          num_layers: 2,
          parameters: {
            learning_rate: 0.01
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('model_id');
      expect(response.body.data.model_type).toBe('classification');
    });

    test('should train ML model', async () => {
      // First create a model
      await request(app)
        .post('/api/quantum/ml/models')
        .send({
          model_id: 'test_train_model',
          model_type: 'classification',
          architecture: 'qnn',
          num_qubits: 4,
          num_layers: 2
        });

      // Then train it
      const response = await request(app)
        .post('/api/quantum/ml/models/test_train_model/train')
        .send({
          algorithm_name: 'qnn',
          features: [[0, 1, 0, 1], [1, 0, 1, 0], [0, 0, 1, 1], [1, 1, 0, 0]],
          labels: [0, 1, 0, 1]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accuracy');
    });

    test('should make predictions', async () => {
      // Create and train model first
      await request(app)
        .post('/api/quantum/ml/models')
        .send({
          model_id: 'test_predict_model',
          model_type: 'classification',
          architecture: 'qnn',
          num_qubits: 4,
          num_layers: 2
        });

      await request(app)
        .post('/api/quantum/ml/models/test_predict_model/train')
        .send({
          algorithm_name: 'qnn',
          features: [[0, 1, 0, 1], [1, 0, 1, 0]],
          labels: [0, 1]
        });

      // Make predictions
      const response = await request(app)
        .post('/api/quantum/ml/models/test_predict_model/predict')
        .send({
          features: [[0, 1, 0, 1]]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('predictions');
      expect(Array.isArray(response.body.data.predictions)).toBe(true);
    });
  });

  describe('Quantum Circuit Design', () => {
    test('should get available circuit designers', async () => {
      const response = await request(app)
        .get('/api/quantum/circuits/designers')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('designers');
      expect(Array.isArray(response.body.data.designers)).toBe(true);
    });

    test('should design quantum circuit', async () => {
      const response = await request(app)
        .post('/api/quantum/circuits/design')
        .send({
          circuit_id: 'test_circuit',
          circuit_type: 'feature_map',
          num_qubits: 4,
          num_parameters: 8,
          depth: 3,
          gate_set: ['h', 'cx', 'rz'],
          entanglement_pattern: 'full',
          parameters: {
            reps: 2
          },
          designer_name: 'qiskit'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('circuit_id');
      expect(response.body.data).toHaveProperty('circuit_depth');
      expect(response.body.data).toHaveProperty('gate_count');
    });

    test('should optimize circuit', async () => {
      // First design a circuit
      await request(app)
        .post('/api/quantum/circuits/design')
        .send({
          circuit_id: 'test_optimize_circuit',
          circuit_type: 'ansatz',
          num_qubits: 4,
          num_parameters: 6,
          depth: 4,
          gate_set: ['rx', 'ry', 'cx']
        });

      // Then optimize it
      const response = await request(app)
        .post('/api/quantum/circuits/test_optimize_circuit/optimize')
        .send({
          optimization_level: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('circuit_depth');
      expect(response.body.data).toHaveProperty('optimization_level');
    });

    test('should list circuits', async () => {
      const response = await request(app)
        .get('/api/quantum/circuits')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('circuits');
      expect(Array.isArray(response.body.data.circuits)).toBe(true);
    });
  });

  describe('Quantum Resource Management', () => {
    test('should list resources', async () => {
      const response = await request(app)
        .get('/api/quantum/resources')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('resources');
      expect(Array.isArray(response.body.data.resources)).toBe(true);
    });

    test('should get resource utilization', async () => {
      const response = await request(app)
        .get('/api/quantum/resources/utilization')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('utilization_rate');
      expect(response.body.data).toHaveProperty('total_resources');
    });

    test('should submit quantum job', async () => {
      const response = await request(app)
        .post('/api/quantum/jobs')
        .send({
          job_id: 'test_job',
          user_id: 'test_user',
          priority: 5,
          resource_requirements: {
            num_qubits: 4,
            gate_set: ['h', 'cx', 'rz']
          },
          estimated_duration: 1.5,
          circuit: {
            num_qubits: 4,
            gates: [
              { name: 'h', qubits: [0] },
              { name: 'cx', qubits: [0, 1] }
            ]
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('job_id');
      expect(response.body.data.message).toContain('submitted successfully');
    });
  });

  describe('Hybrid Computing', () => {
    test('should get available hybrid strategies', async () => {
      const response = await request(app)
        .get('/api/quantum/hybrid/strategies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('strategies');
      expect(Array.isArray(response.body.data.strategies)).toBe(true);
    });

    test('should execute hybrid task', async () => {
      const response = await request(app)
        .post('/api/quantum/hybrid/execute')
        .send({
          task_id: 'test_hybrid_task',
          task_type: 'classification',
          data: {
            features: [[0, 1, 0, 1], [1, 0, 1, 0]],
            labels: [0, 1]
          },
          quantum_component: 'feature_extraction',
          classical_component: 'random_forest',
          strategy_name: 'classification'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('task_id');
      expect(response.body.data).toHaveProperty('execution_time');
    });
  });

  describe('Error Correction', () => {
    test('should get available error correction codes', async () => {
      const response = await request(app)
        .get('/api/quantum/error-correction/codes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('codes');
      expect(Array.isArray(response.body.data.codes)).toBe(true);
    });

    test('should apply error correction', async () => {
      const response = await request(app)
        .post('/api/quantum/error-correction/apply')
        .send({
          circuit: {
            num_qubits: 3,
            gates: [
              { name: 'h', qubits: [0] },
              { name: 'cx', qubits: [0, 1] }
            ]
          },
          code_name: 'bit_flip_3',
          error_models: [
            {
              error_type: 'bit_flip',
              error_probability: 0.1,
              affected_qubits: [0, 1, 2]
            }
          ]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fidelity_before');
      expect(response.body.data).toHaveProperty('fidelity_after');
      expect(response.body.data).toHaveProperty('success');
    });

    test('should get error correction performance', async () => {
      const response = await request(app)
        .get('/api/quantum/error-correction/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_corrections');
      expect(response.body.data).toHaveProperty('success_rate');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid quantum provider', async () => {
      const response = await request(app)
        .post('/api/quantum/providers/connect')
        .send({
          provider: 'invalid_provider',
          config: {}
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid optimization problem', async () => {
      const response = await request(app)
        .post('/api/quantum/optimization/solve')
        .send({
          problem: {
            problem_id: 'invalid',
            problem_type: 'invalid_type',
            variables: -1
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should handle missing ML model', async () => {
      const response = await request(app)
        .post('/api/quantum/ml/models/nonexistent_model/train')
        .send({
          algorithm_name: 'qnn',
          features: [[0, 1]],
          labels: [0]
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .get('/api/quantum/providers')
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    test('should handle large optimization problems', async () => {
      const response = await request(app)
        .post('/api/quantum/optimization/solve')
        .send({
          problem: {
            problem_id: 'large_problem',
            problem_type: 'maxcut',
            variables: 20,
            constraints: [],
            objective_matrix: Array(20).fill().map(() => 
              Array(20).fill().map(() => Math.random() > 0.7 ? 1 : 0)
            )
          },
          optimizer_name: 'qaoa'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.solution).toHaveLength(20);
    });
  });
});

describe('Quantum Services Direct Tests', () => {
  test('should initialize quantum services', () => {
    expect(quantumServices).toBeDefined();
    expect(typeof quantumServices.executeRequest).toBe('function');
  });

  test('should perform health check', async () => {
    const health = await quantumServices.healthCheck();
    expect(health).toHaveProperty('healthy');
    expect(health).toHaveProperty('timestamp');
  });

  test('should handle service timeouts', async () => {
    quantumServices.setRequestTimeout(100); // Very short timeout
    
    try {
      await quantumServices.executeRequest('quantum_algorithms', 'get_providers');
    } catch (error) {
      expect(error.message).toContain('timeout');
    }
    
    quantumServices.setRequestTimeout(30000); // Reset timeout
  });

  test('should cache results', async () => {
    quantumServices.clearCache();
    
    // First call
    const result1 = await quantumServices.executeRequest('quantum_algorithms', 'get_providers');
    
    // Second call (should use cache)
    const result2 = await quantumServices.executeRequest('quantum_algorithms', 'get_providers');
    
    expect(result1).toEqual(result2);
  });
});
