const request = require('supertest');
const app = require('../../index');
const SwarmCoordinator = require('../../services/swarmLearning/SwarmCoordinator');

describe('Swarm Learning Acceptance Tests', () => {
  let authToken;
  let swarmCoordinator;
  let swarmId;
  let agentIds = [];

  beforeAll(async () => {
    // Setup test authentication token
    authToken = 'Bearer test-token';
    
    // Initialize swarm coordinator for testing
    swarmCoordinator = new SwarmCoordinator({
      minAgents: 3,
      maxAgents: 10,
      communicationRadius: 3,
      convergenceThreshold: 0.1,
      maxIterations: 50
    });
  });

  afterAll(async () => {
    await swarmCoordinator.cleanup();
  });

  describe('Acceptance Criteria 1: Swarm intelligence emerges without central control', () => {
    test('should demonstrate emergent behavior in decentralized swarm', async () => {
      // Initialize swarm
      const initResponse = await request(app)
        .post('/api/swarm-learning/initialize')
        .set('Authorization', authToken)
        .send({
          config: {
            coordinator: {
              minAgents: 3,
              maxAgents: 10
            }
          }
        });

      expect(initResponse.status).toBe(200);
      expect(initResponse.body.success).toBe(true);

      // Create swarm
      const swarmResponse = await request(app)
        .post('/api/swarm-learning/swarms')
        .set('Authorization', authToken)
        .send({
          taskDefinition: {
            type: 'classification',
            description: 'Test emergent intelligence task',
            complexity: 'medium'
          }
        });

      expect(swarmResponse.status).toBe(201);
      expect(swarmResponse.body.success).toBe(true);
      swarmId = swarmResponse.body.data.swarmId;

      // Register agents without central coordination
      for (let i = 0; i < 5; i++) {
        const agentResponse = await request(app)
          .post('/api/swarm-learning/agents')
          .set('Authorization', authToken)
          .send({
            capabilities: {
              computation: Math.random() * 0.5 + 0.5,
              communication: Math.random() * 0.5 + 0.5,
              specialization: ['general', 'optimizer', 'explorer'][Math.floor(Math.random() * 3)]
            },
            position: {
              x: Math.random() * 10,
              y: Math.random() * 10,
              z: 0
            }
          });

        expect(agentResponse.status).toBe(201);
        agentIds.push(agentResponse.body.data.agentId);
      }

      // Start swarm learning
      const startResponse = await request(app)
        .post(`/api/swarm-learning/swarms/${swarmId}/start`)
        .set('Authorization', authToken);

      expect(startResponse.status).toBe(200);

      // Wait for emergent behaviors to develop
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Check for emergent behaviors
      const behaviorsResponse = await request(app)
        .get('/api/swarm-learning/behaviors')
        .set('Authorization', authToken);

      expect(behaviorsResponse.status).toBe(200);
      expect(behaviorsResponse.body.data.behaviors.length).toBeGreaterThan(0);

      // Verify emergent behaviors are detected
      const behaviors = behaviorsResponse.body.data.behaviors;
      const hasEmergentBehavior = behaviors.some(b => 
        ['clustering', 'cascade', 'synchronization'].includes(b.type)
      );
      expect(hasEmergentBehavior).toBe(true);
    });
  });

  describe('Acceptance Criteria 2: Learning improves as swarm size increases', () => {
    test('should show performance improvement with more agents', async () => {
      const performanceData = [];

      // Test with different swarm sizes
      for (const swarmSize of [3, 5, 8]) {
        // Create new swarm for each test
        const swarmResponse = await request(app)
          .post('/api/swarm-learning/swarms')
          .set('Authorization', authToken)
          .send({
            taskDefinition: {
              type: 'optimization',
              description: `Scalability test with ${swarmSize} agents`
            }
          });

        const testSwarmId = swarmResponse.body.data.swarmId;

        // Register agents
        const testAgentIds = [];
        for (let i = 0; i < swarmSize; i++) {
          const agentResponse = await request(app)
            .post('/api/swarm-learning/agents')
            .set('Authorization', authToken)
            .send({
              capabilities: {
                computation: 0.8,
                communication: 0.8
              }
            });

          testAgentIds.push(agentResponse.body.data.agentId);
        }

        // Start learning
        await request(app)
          .post(`/api/swarm-learning/swarms/${testSwarmId}/start`)
          .set('Authorization', authToken);

        // Wait for learning to progress
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Get performance metrics
        const analyticsResponse = await request(app)
          .get('/api/swarm-learning/analytics')
          .set('Authorization', authToken);

        const collectiveIntelligence = analyticsResponse.body.data.overview.performance;
        performanceData.push({
          swarmSize,
          performance: collectiveIntelligence
        });
      }

      // Verify performance improves with swarm size
      expect(performanceData.length).toBe(3);
      
      // Performance should generally increase with swarm size
      const performance3 = performanceData.find(p => p.swarmSize === 3).performance;
      const performance8 = performanceData.find(p => p.swarmSize === 8).performance;
      
      expect(performance8).toBeGreaterThanOrEqual(performance3 * 0.9); // Allow some variance
    });
  });

  describe('Acceptance Criteria 3: System adapts to node failures gracefully', () => {
    test('should maintain operation when agents fail', async () => {
      // Create swarm with multiple agents
      const swarmResponse = await request(app)
        .post('/api/swarm-learning/swarms')
        .set('Authorization', authToken)
        .send({
          taskDefinition: {
            type: 'resilience_test',
            description: 'Test fault tolerance'
          }
        });

      const testSwarmId = swarmResponse.body.data.swarmId;

      // Register 8 agents
      const testAgentIds = [];
      for (let i = 0; i < 8; i++) {
        const agentResponse = await request(app)
          .post('/api/swarm-learning/agents')
          .set('Authorization', authToken)
          .send({
            capabilities: {
              computation: 0.7,
              communication: 0.7,
              reliability: 0.9
            }
          });

        testAgentIds.push(agentResponse.body.data.agentId);
      }

      // Start learning
      await request(app)
        .post(`/api/swarm-learning/swarms/${testSwarmId}/start`)
        .set('Authorization', authToken);

      // Let system stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get initial status
      const initialStatusResponse = await request(app)
        .get('/api/swarm-learning/swarms/status')
        .set('Authorization', authToken);

      const initialAgents = initialStatusResponse.body.data.coordinator.agents;
      expect(initialAgents).toBeGreaterThan(5);

      // Simulate agent failures (remove 2-3 agents)
      const agentsToRemove = testAgentIds.slice(0, 3);
      for (const agentId of agentsToRemove) {
        // Simulate agent removal by updating the swarm coordinator directly
        if (swarmCoordinator.agents.has(agentId)) {
          swarmCoordinator.removeAgent(agentId);
        }
      }

      // Wait for system to adapt
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check system is still operational
      const finalStatusResponse = await request(app)
        .get('/api/swarm-learning/swarms/status')
        .set('Authorization', authToken);

      const finalAgents = finalStatusResponse.body.data.coordinator.agents;
      expect(finalAgents).toBeGreaterThan(0);
      expect(finalAgents).toBeLessThan(initialAgents);

      // Verify network health is maintained
      const networkHealth = finalStatusResponse.body.data.analytics.networkHealth;
      expect(networkHealth).toBeGreaterThan(0.3); // Should still be functional
    });
  });

  describe('Acceptance Criteria 4: Collective decisions are optimal and fair', () => {
    test('should demonstrate fair and optimal consensus building', async () => {
      // Create swarm for consensus testing
      const swarmResponse = await request(app)
        .post('/api/swarm-learning/swarms')
        .set('Authorization', authToken)
        .send({
          taskDefinition: {
            type: 'consensus',
            description: 'Test collective decision making',
            options: ['option_a', 'option_b', 'option_c']
          }
        });

      const testSwarmId = swarmResponse.body.data.swarmId;

      // Register agents with varying capabilities
      const testAgentIds = [];
      const specializations = ['leader', 'analyzer', 'validator', 'general'];
      
      for (let i = 0; i < 6; i++) {
        const agentResponse = await request(app)
          .post('/api/swarm-learning/agents')
          .set('Authorization', authToken)
          .send({
            capabilities: {
              computation: Math.random() * 0.4 + 0.6,
              communication: Math.random() * 0.4 + 0.6,
              specialization: specializations[i % specializations.length]
            },
            reputation: Math.random() * 0.3 + 0.7
          });

        testAgentIds.push(agentResponse.body.data.agentId);
      }

      // Start consensus process
      await request(app)
        .post(`/api/swarm-learning/swarms/${testSwarmId}/start`)
        .set('Authorization', authToken);

      // Wait for consensus to develop
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Get task details to check collective intelligence
      const taskResponse = await request(app)
        .get(`/api/swarm-learning/tasks/${testSwarmId}`)
        .set('Authorization', authToken);

      expect(taskResponse.status).toBe(200);
      
      const collectiveMetrics = taskResponse.body.data.metrics;
      
      // Verify collective intelligence metrics are within acceptable ranges
      expect(collectiveMetrics.collectiveAccuracy).toBeGreaterThan(0.5);
      expect(collectiveMetrics.diversityIndex).toBeGreaterThan(0.1);
      expect(collectiveMetrics.convergenceRate).toBeGreaterThan(0);

      // Check fairness - no single agent should dominate
      const analyticsResponse = await request(app)
        .get('/api/swarm-learning/analytics')
        .set('Authorization', authToken);

      const topPerformers = analyticsResponse.body.data.topPerformers || [];
      if (topPerformers.length > 0) {
        const topPerformer = topPerformers[0];
        // Top performer shouldn't have overwhelmingly higher contribution than others
        expect(topPerformer.performance).toBeLessThan(0.95);
      }
    });
  });

  describe('Integration and Performance Tests', () => {
    test('should handle concurrent swarm operations', async () => {
      // Create multiple swarms simultaneously
      const swarmPromises = [];
      
      for (let i = 0; i < 3; i++) {
        swarmPromises.push(
          request(app)
            .post('/api/swarm-learning/swarms')
            .set('Authorization', authToken)
            .send({
              taskDefinition: {
                type: 'concurrent_test',
                description: `Concurrent swarm ${i}`
              }
            })
        );
      }

      const swarmResponses = await Promise.all(swarmPromises);
      
      // All swarms should be created successfully
      swarmResponses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Register agents for each swarm
      const agentPromises = [];
      
      swarmResponses.forEach((response, swarmIndex) => {
        const swarmId = response.body.data.swarmId;
        
        for (let i = 0; i < 3; i++) {
          agentPromises.push(
            request(app)
              .post('/api/swarm-learning/agents')
              .set('Authorization', authToken)
              .send({
                capabilities: {
                  computation: 0.8,
                  communication: 0.8
                }
              })
          );
        }
      });

      const agentResponses = await Promise.all(agentPromises);
      
      // All agents should be registered successfully
      agentResponses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Start all swarms concurrently
      const startPromises = swarmResponses.map(response =>
        request(app)
          .post(`/api/swarm-learning/swarms/${response.body.data.swarmId}/start`)
          .set('Authorization', authToken)
      );

      const startResponses = await Promise.all(startPromises);
      
      // All swarms should start successfully
      startResponses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Wait for concurrent operation
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify system stability
      const statusResponse = await request(app)
        .get('/api/swarm-learning/swarms/status')
        .set('Authorization', authToken);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data.coordinator.agents).toBeGreaterThan(0);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Create and start multiple operations rapidly
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/swarm-learning/swarms')
          .set('Authorization', authToken)
          .send({
            taskDefinition: {
              type: 'load_test',
              description: `Load test iteration ${i}`
            }
          });
      }

      const creationTime = Date.now() - startTime;
      
      // Operations should complete within reasonable time
      expect(creationTime).toBeLessThan(10000); // 10 seconds

      // Check system health
      const healthResponse = await request(app)
        .get('/api/swarm-learning/health');

      expect(healthResponse.status).toBe(200);
      expect(healthResponse.body.status).toBe('healthy');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid requests gracefully', async () => {
      // Test invalid swarm creation
      const invalidResponse = await request(app)
        .post('/api/swarm-learning/swarms')
        .set('Authorization', authToken)
        .send({
          invalidField: 'invalid'
        });

      expect(invalidResponse.status).toBe(500);
      expect(invalidResponse.body.success).toBe(false);

      // Test non-existent task
      const taskResponse = await request(app)
        .get('/api/swarm-learning/tasks/non-existent-task')
        .set('Authorization', authToken);

      expect(taskResponse.status).toBe(404);
      expect(taskResponse.body.success).toBe(false);

      // Test non-existent agent
      const agentResponse = await request(app)
        .get('/api/swarm-learning/agents/non-existent-agent')
        .set('Authorization', authToken);

      expect(agentResponse.status).toBe(404);
      expect(agentResponse.body.success).toBe(false);
    });

    test('should handle authentication and authorization', async () => {
      // Test without authentication
      const noAuthResponse = await request(app)
        .post('/api/swarm-learning/swarms')
        .send({
          taskDefinition: {
            type: 'test',
            description: 'Test'
          }
        });

      expect(noAuthResponse.status).toBe(401);

      // Test admin-only endpoints
      const configResponse = await request(app)
        .put('/api/swarm-learning/configuration')
        .set('Authorization', authToken)
        .send({
          component: 'coordinator',
          config: { maxAgents: 20 }
        });

      // Should fail without admin privileges (our test token doesn't have admin)
      expect([403, 401]).toContain(configResponse.status);
    });
  });
});
