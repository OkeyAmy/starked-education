const SwarmCoordinator = require('../services/swarmLearning/SwarmCoordinator');
const AgentCommunication = require('../services/swarmLearning/AgentCommunication');
const EmergentBehaviorDetector = require('../services/swarmLearning/EmergentBehaviorDetector');
const CollectiveIntelligence = require('../services/swarmLearning/CollectiveIntelligence');
const SelfOrganizingNetwork = require('../services/swarmLearning/SelfOrganizingNetwork');
const SwarmAnalytics = require('../services/swarmLearning/SwarmAnalytics');

describe('Swarm Learning System', () => {
  let swarmCoordinator;
  let agentCommunication;
  let behaviorDetector;
  let collectiveIntelligence;
  let networkManager;
  let analytics;

  beforeEach(() => {
    swarmCoordinator = new SwarmCoordinator({
      minAgents: 2,
      maxAgents: 10,
      communicationRadius: 3,
      convergenceThreshold: 0.1
    });

    agentCommunication = new AgentCommunication({
      encryptionEnabled: false,
      authenticationEnabled: false
    });

    behaviorDetector = new EmergentBehaviorDetector({
      detectionWindow: 1000,
      minPatternOccurrences: 2
    });

    collectiveIntelligence = new CollectiveIntelligence({
      consensusThreshold: 0.5,
      diversityBonus: 0.1
    });

    networkManager = new SelfOrganizingNetwork({
      initialConnections: 2,
      maxConnections: 5,
      reorganizationInterval: 1000
    });

    analytics = new SwarmAnalytics({
      metricsRetentionPeriod: 5000,
      aggregationInterval: 500
    });
  });

  afterEach(async () => {
    await swarmCoordinator.cleanup();
    await agentCommunication.cleanup();
    await behaviorDetector.cleanup();
    await collectiveIntelligence.cleanup();
    await networkManager.cleanup();
    await analytics.cleanup();
  });

  describe('SwarmCoordinator', () => {
    test('should initialize swarm session', async () => {
      const taskDefinition = {
        type: 'classification',
        description: 'Test classification task'
      };

      const swarmId = await swarmCoordinator.initializeSwarm(taskDefinition);
      
      expect(swarmId).toBeDefined();
      expect(typeof swarmId).toBe('string');
    });

    test('should register agent', async () => {
      const taskDefinition = {
        type: 'classification',
        description: 'Test classification task'
      };

      await swarmCoordinator.initializeSwarm(taskDefinition);

      const agentConfig = {
        capabilities: { computation: 1.0, communication: 1.0 },
        position: { x: 0, y: 0, z: 0 }
      };

      const agentId = await swarmCoordinator.registerAgent(agentConfig);
      
      expect(agentId).toBeDefined();
      expect(typeof agentId).toBe('string');
    });

    test('should get swarm status', () => {
      const status = swarmCoordinator.getSwarmStatus();
      
      expect(status).toHaveProperty('agents');
      expect(status).toHaveProperty('activeTasks');
      expect(status).toHaveProperty('networkTopology');
      expect(status).toHaveProperty('performanceMetrics');
    });
  });

  describe('AgentCommunication', () => {
    test('should initialize communication', async () => {
      await agentCommunication.initialize('test-agent');
      
      expect(agentCommunication.agentId).toBe('test-agent');
    });

    test('should establish connection', async () => {
      await agentCommunication.initialize('test-agent');
      
      const agentInfo = {
        id: 'other-agent',
        capabilities: { computation: 1.0 }
      };

      await agentCommunication.establishConnection('other-agent', agentInfo);
      
      const status = agentCommunication.getConnectionStatus();
      expect(status.totalConnections).toBe(1);
    });

    test('should send message', async () => {
      await agentCommunication.initialize('test-agent');
      
      const agentInfo = {
        id: 'other-agent',
        capabilities: { computation: 1.0 }
      };

      await agentCommunication.establishConnection('other-agent', agentInfo);
      
      const messageId = await agentCommunication.sendMessage(
        'other-agent',
        'knowledge_share',
        { data: 'test knowledge' }
      );
      
      expect(messageId).toBeDefined();
    });
  });

  describe('EmergentBehaviorDetector', () => {
    test('should initialize detector', async () => {
      await behaviorDetector.initialize();
      
      expect(behaviorDetector.config.detectionWindow).toBe(1000);
    });

    test('should record observation', () => {
      const observation = {
        agentId: 'test-agent',
        action: 'test-action',
        target: 'test-target'
      };

      behaviorDetector.recordObservation(observation);
      
      expect(behaviorDetector.observationHistory).toHaveLength(1);
    });

    test('should detect patterns', () => {
      // Add multiple observations
      for (let i = 0; i < 5; i++) {
        behaviorDetector.recordObservation({
          agentId: `agent-${i}`,
          action: 'test-action',
          target: 'test-target',
          connections: new Set([`agent-${(i + 1) % 5}`])
        });
      }

      const patterns = behaviorDetector._detectPatterns();
      
      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('CollectiveIntelligence', () => {
    test('should initialize system', async () => {
      await collectiveIntelligence.initialize();
      
      expect(collectiveIntelligence.config.aggregationMethod).toBe('weighted_average');
    });

    test('should aggregate agent knowledge', () => {
      const agentKnowledge = [
        {
          agentId: 'agent-1',
          weights: [0.1, 0.2, 0.3],
          accuracy: 0.8,
          confidence: 0.9
        },
        {
          agentId: 'agent-2',
          weights: [0.2, 0.1, 0.4],
          accuracy: 0.7,
          confidence: 0.8
        }
      ];

      const result = collectiveIntelligence.aggregateAgentKnowledge(agentKnowledge, 'test-task');
      
      expect(result).toHaveProperty('weights');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('accuracy');
      expect(result).toHaveProperty('contributors');
    });

    test('should calculate diversity index', () => {
      const agentKnowledge = [
        { weights: [0.1, 0.2, 0.3] },
        { weights: [0.9, 0.8, 0.7] }
      ];

      const diversity = collectiveIntelligence._calculateDiversityIndex(agentKnowledge);
      
      expect(diversity).toBeGreaterThan(0);
      expect(diversity).toBeLessThanOrEqual(1);
    });
  });

  describe('SelfOrganizingNetwork', () => {
    test('should initialize network', async () => {
      await networkManager.initialize();
      
      expect(networkManager.config.initialConnections).toBe(2);
    });

    test('should add agent', () => {
      const agentInfo = {
        id: 'test-agent',
        capabilities: { computation: 1.0 }
      };

      networkManager.addAgent('test-agent', agentInfo);
      
      const topology = networkManager.getNetworkTopology();
      expect(topology).toHaveProperty('test-agent');
    });

    test('should remove agent', () => {
      const agentInfo = {
        id: 'test-agent',
        capabilities: { computation: 1.0 }
      };

      networkManager.addAgent('test-agent', agentInfo);
      networkManager.removeAgent('test-agent');
      
      const topology = networkManager.getNetworkTopology();
      expect(topology).not.toHaveProperty('test-agent');
    });

    test('should calculate network metrics', () => {
      // Add multiple agents
      for (let i = 0; i < 3; i++) {
        networkManager.addAgent(`agent-${i}`, {
          id: `agent-${i}`,
          capabilities: { computation: 1.0 }
        });
      }

      networkManager._calculateNetworkMetrics();
      
      expect(networkManager.networkMetrics).toHaveProperty('connectivity');
      expect(networkManager.networkMetrics).toHaveProperty('clustering');
      expect(networkManager.networkMetrics).toHaveProperty('pathLength');
    });
  });

  describe('SwarmAnalytics', () => {
    test('should initialize analytics', async () => {
      await analytics.initialize();
      
      expect(analytics.config.aggregationInterval).toBe(500);
    });

    test('should record metric', () => {
      analytics.recordMetric('test-metric', 0.5, { source: 'test' });
      
      const metrics = analytics.getMetrics('test-metric');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(0.5);
    });

    test('should record agent metrics', () => {
      const agentMetrics = {
        performance: 0.8,
        reliability: 0.9,
        contribution: 0.7
      };

      analytics.recordAgentMetrics('test-agent', agentMetrics);
      
      const metrics = analytics.getAgentPerformance('test-agent');
      expect(metrics).toHaveProperty('agentId', 'test-agent');
      expect(metrics).toHaveProperty('performance', 0.8);
    });

    test('should generate system overview', () => {
      const overview = analytics.getSystemOverview();
      
      expect(overview).toHaveProperty('timestamp');
      expect(overview).toHaveProperty('agents');
      expect(overview).toHaveProperty('performance');
      expect(overview).toHaveProperty('networkHealth');
    });

    test('should generate report', () => {
      analytics.recordMetric('performance', 0.8);
      analytics.recordMetric('convergence', 0.7);

      const report = analytics.generateReport();
      
      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('Integration Tests', () => {
    test('should work together as complete system', async () => {
      // Initialize all components
      await swarmCoordinator.initialize();
      await agentCommunication.initialize('coordinator');
      await behaviorDetector.initialize();
      await collectiveIntelligence.initialize();
      await networkManager.initialize();
      await analytics.initialize();

      // Create swarm
      const taskDefinition = {
        type: 'classification',
        description: 'Integration test task'
      };

      const swarmId = await swarmCoordinator.initializeSwarm(taskDefinition);
      expect(swarmId).toBeDefined();

      // Add agents
      const agentIds = [];
      for (let i = 0; i < 3; i++) {
        const agentConfig = {
          capabilities: { computation: 1.0, communication: 1.0 },
          position: { x: i, y: 0, z: 0 }
        };

        const agentId = await swarmCoordinator.registerAgent(agentConfig);
        agentIds.push(agentId);
        networkManager.addAgent(agentId, agentConfig);
      }

      expect(agentIds).toHaveLength(3);

      // Record some metrics
      analytics.recordMetric('agents_registered', 3);
      analytics.recordMetric('swarm_initialized', 1);

      // Check system status
      const status = swarmCoordinator.getSwarmStatus();
      expect(status.agents).toBe(3);

      const overview = analytics.getSystemOverview();
      expect(overview.agents).toBe(3);
    });
  });
});
