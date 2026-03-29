#!/usr/bin/env node

/**
 * Comprehensive Swarm Learning Example
 * 
 * This example demonstrates how to use the swarm learning system
 * to create a decentralized AI swarm that collaborates on a classification task.
 */

const express = require('express');
const cors = require('cors');
const SwarmCoordinator = require('./src/services/swarmLearning/SwarmCoordinator');
const AgentCommunication = require('./src/services/swarmLearning/AgentCommunication');
const EmergentBehaviorDetector = require('./src/services/swarmLearning/EmergentBehaviorDetector');
const CollectiveIntelligence = require('./src/services/swarmLearning/CollectiveIntelligence');
const SelfOrganizingNetwork = require('./src/services/swarmLearning/SelfOrganizingNetwork');
const SwarmAnalytics = require('./src/services/swarmLearning/SwarmAnalytics');

// Mock logger for demo
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`)
};

class SwarmLearningDemo {
  constructor() {
    this.swarmCoordinator = null;
    this.agentCommunication = null;
    this.behaviorDetector = null;
    this.collectiveIntelligence = null;
    this.networkManager = null;
    this.analytics = null;
    this.agents = [];
    this.swarmId = null;
  }

  async initialize() {
    console.log('🐝 Initializing Swarm Learning Demo...\n');

    try {
      // Initialize all components
      this.swarmCoordinator = new SwarmCoordinator({
        minAgents: 3,
        maxAgents: 20,
        communicationRadius: 5,
        convergenceThreshold: 0.1,
        learningRate: 0.01,
        explorationRate: 0.1
      });

      this.agentCommunication = new AgentCommunication({
        encryptionEnabled: false, // Disabled for demo
        authenticationEnabled: false
      });

      this.behaviorDetector = new EmergentBehaviorDetector({
        detectionWindow: 30000,
        minPatternOccurrences: 3,
        confidenceThreshold: 0.6
      });

      this.collectiveIntelligence = new CollectiveIntelligence({
        consensusThreshold: 0.5,
        diversityBonus: 0.1,
        aggregationMethod: 'weighted_average'
      });

      this.networkManager = new SelfOrganizingNetwork({
        initialConnections: 3,
        maxConnections: 8,
        reorganizationInterval: 15000,
        topologyType: 'small_world'
      });

      this.analytics = new SwarmAnalytics({
        metricsRetentionPeriod: 300000,
        aggregationInterval: 5000
      });

      // Initialize components
      await this.swarmCoordinator.initialize();
      await this.agentCommunication.initialize('demo-coordinator');
      await this.behaviorDetector.initialize();
      await this.collectiveIntelligence.initialize();
      await this.networkManager.initialize();
      await this.analytics.initialize();

      // Setup event handlers
      this.setupEventHandlers();

      console.log('✅ All components initialized successfully\n');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      return false;
    }
  }

  setupEventHandlers() {
    // Swarm coordinator events
    this.swarmCoordinator.on('swarmInitialized', (data) => {
      console.log(`🎯 Swarm initialized: ${data.swarmId}`);
      this.analytics.recordMetric('swarm_initialized', 1, data);
    });

    this.swarmCoordinator.on('agentRegistered', (data) => {
      console.log(`🤖 Agent registered: ${data.agentId}`);
      this.analytics.recordMetric('agent_registered', 1, data);
    });

    this.swarmCoordinator.on('swarmLearningStarted', (data) => {
      console.log(`🚀 Learning started for swarm: ${data.swarmId}`);
      this.analytics.recordMetric('learning_started', 1, data);
    });

    this.swarmCoordinator.on('swarmConverged', (data) => {
      console.log(`🎯 Swarm converged: ${data.swarmId}`);
      this.analytics.recordMetric('swarm_converged', 1, data);
    });

    // Behavior detector events
    this.behaviorDetector.on('emergentBehavior', (behavior) => {
      console.log(`🌟 Emergent behavior detected: ${behavior.type} (confidence: ${behavior.confidence})`);
      this.analytics.recordMetric('emergent_behavior', 1, behavior);
    });

    // Network manager events
    this.networkManager.on('networkReorganized', (data) => {
      console.log(`🔄 Network reorganized: ${data.changes.length} changes`);
      this.analytics.recordMetric('network_reorganized', 1, data);
    });

    // Analytics events
    this.analytics.on('alert', (alert) => {
      console.log(`⚠️  Alert: ${alert.message}`);
    });
  }

  async createSwarm() {
    console.log('📋 Creating swarm for image classification task...');

    const taskDefinition = {
      type: 'classification',
      description: 'Collaborative image classification for educational content',
      complexity: 'medium',
      dataset: 'educational_images_v1',
      objectives: ['accuracy', 'collaboration', 'efficiency'],
      parameters: {
        classes: ['math', 'science', 'history', 'literature', 'art'],
        inputSize: [224, 224, 3],
        targetAccuracy: 0.85
      }
    };

    try {
      this.swarmId = await this.swarmCoordinator.initializeSwarm(taskDefinition);
      console.log(`✅ Swarm created with ID: ${this.swarmId}\n`);
      return this.swarmId;
    } catch (error) {
      console.error('❌ Failed to create swarm:', error.message);
      return null;
    }
  }

  async registerAgents(count = 8) {
    console.log(`🤖 Registering ${count} agents with diverse capabilities...`);

    const specializations = ['general', 'classification', 'optimization', 'explorer', 'communicator'];
    const agentIds = [];

    for (let i = 0; i < count; i++) {
      const agentConfig = {
        capabilities: {
          computation: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
          communication: Math.random() * 0.5 + 0.5,
          specialization: specializations[Math.floor(Math.random() * specializations.length)],
          resources: {
            cpu: Math.floor(Math.random() * 4) + 2,
            memory: `${Math.floor(Math.random() * 8) + 4}GB`,
            storage: `${Math.floor(Math.random() * 100) + 50}GB`
          }
        },
        position: {
          x: Math.random() * 20,
          y: Math.random() * 20,
          z: 0
        },
        preferences: {
          taskTypes: ['classification'],
          collaborationStyle: ['active', 'passive', 'adaptive'][Math.floor(Math.random() * 3)]
        }
      };

      try {
        const agentId = await this.swarmCoordinator.registerAgent(agentConfig);
        agentIds.push(agentId);
        
        // Add to network
        this.networkManager.addAgent(agentId, {
          id: agentId,
          capabilities: agentConfig.capabilities,
          position: agentConfig.position
        });

        // Initialize agent communication
        const agentComm = new AgentCommunication({
          encryptionEnabled: false,
          authenticationEnabled: false
        });
        await agentComm.initialize(agentId);

        this.agents.push({
          id: agentId,
          config: agentConfig,
          communication: agentComm
        });

        console.log(`  ✅ Agent ${i + 1}/${count} registered: ${agentId}`);
      } catch (error) {
        console.error(`  ❌ Failed to register agent ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ Successfully registered ${agentIds.length} agents\n`);
    return agentIds;
  }

  async startLearning() {
    console.log('🚀 Starting collaborative learning process...');

    try {
      // Start swarm learning
      await this.swarmCoordinator.startSwarmLearning(this.swarmId);

      // Simulate learning iterations
      const iterations = 20;
      console.log(`📚 Running ${iterations} learning iterations...\n`);

      for (let iteration = 0; iteration < iterations; iteration++) {
        console.log(`🔄 Iteration ${iteration + 1}/${iterations}`);

        // Simulate agent learning and collaboration
        await this.simulateLearningIteration(iteration);

        // Record metrics
        const avgPerformance = this.calculateAveragePerformance();
        const convergence = this.calculateConvergence();
        
        this.analytics.recordMetric('iteration_performance', avgPerformance);
        this.analytics.recordMetric('convergence_rate', convergence);

        // Check for emergent behaviors
        this.behaviorDetector.recordObservation({
          type: 'collaboration',
          iteration: iteration,
          performance: avgPerformance,
          agentCount: this.agents.length
        });

        // Small delay between iterations
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('\n✅ Learning process completed!\n');
    } catch (error) {
      console.error('❌ Learning process failed:', error.message);
    }
  }

  async simulateLearningIteration(iteration) {
    const learningActivities = [];

    // Simulate individual agent learning
    for (const agent of this.agents) {
      const performance = Math.random() * 0.3 + 0.7; // 0.7 to 1.0
      const knowledgeGain = performance * 0.1;

      // Agent shares knowledge with neighbors
      const neighbors = this.networkManager.getAgentConnections(agent.id);
      if (neighbors && neighbors.length > 0) {
        for (const neighborId of neighbors) {
          this.agentCommunication.sendMessage(agent.id, neighborId, {
            type: 'knowledge_share',
            knowledge: {
              accuracy: performance,
              insights: [`Insight from ${agent.id}`],
              iteration: iteration
            }
          });
        }
      }

      learningActivities.push({
        agentId: agent.id,
        performance: performance,
        knowledgeGain: knowledgeGain,
        collaboration: neighbors.length
      });
    }

    // Aggregate collective intelligence
    const agentKnowledge = learningActivities.map(activity => ({
      agentId: activity.agentId,
      knowledge: {
        accuracy: activity.performance,
        confidence: activity.performance * 0.9,
        contribution: activity.knowledgeGain
      }
    }));

    this.collectiveIntelligence.aggregateAgentKnowledge(agentKnowledge, this.swarmId);

    // Network reorganization
    if (iteration % 5 === 0) {
      this.networkManager.reorganizeNetwork();
    }

    return learningActivities;
  }

  calculateAveragePerformance() {
    if (this.agents.length === 0) return 0;
    
    const totalPerformance = this.agents.reduce((sum, agent) => {
      return sum + (Math.random() * 0.3 + 0.7); // Simulated performance
    }, 0);
    
    return totalPerformance / this.agents.length;
  }

  calculateConvergence() {
    // Simulate convergence calculation
    const baseConvergence = Math.min(0.9, this.agents.length * 0.1);
    const variance = Math.random() * 0.2 - 0.1;
    return Math.max(0, Math.min(1, baseConvergence + variance));
  }

  async demonstrateEmergentBehaviors() {
    console.log('🌟 Demonstrating emergent behavior detection...');

    // Simulate various emergent behaviors
    const behaviors = [
      {
        type: 'collaborative_learning',
        description: 'Agents spontaneously forming learning groups',
        agents: this.agents.slice(0, 3).map(a => a.id)
      },
      {
        type: 'knowledge_sharing',
        description: 'Efficient peer-to-peer knowledge exchange',
        agents: this.agents.slice(2, 5).map(a => a.id)
      },
      {
        type: 'self_organization',
        description: 'Network adapting to optimize performance',
        agents: this.agents.slice(1, 4).map(a => a.id)
      }
    ];

    for (const behavior of behaviors) {
      this.behaviorDetector.recordObservation({
        type: behavior.type,
        description: behavior.description,
        agents: behavior.agents,
        confidence: Math.random() * 0.3 + 0.7,
        timestamp: new Date().toISOString()
      });
    }

    // Wait for behavior detection
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('✅ Emergent behavior detection completed\n');
  }

  async showAnalytics() {
    console.log('📊 Swarm Learning Analytics Report\n');

    try {
      const analytics = await this.analytics.getAnalytics();
      const swarmStatus = this.swarmCoordinator.getSwarmStatus();

      console.log('📈 Performance Metrics:');
      console.log(`  • Total Agents: ${swarmStatus.agents.size}`);
      console.log(`  • Active Tasks: ${swarmStatus.activeTasks.size}`);
      console.log(`  • Network Efficiency: ${(this.calculateAveragePerformance() * 100).toFixed(1)}%`);
      console.log(`  • Convergence Rate: ${(this.calculateConvergence() * 100).toFixed(1)}%`);

      console.log('\n🔗 Network Topology:');
      console.log(`  • Connected Components: ${Object.keys(swarmStatus.networkTopology).length}`);
      console.log(`  • Average Connections: ${this.calculateAverageConnections()}`);

      console.log('\n🌟 Emergent Behaviors:');
      const detectedBehaviors = this.behaviorDetector.getDetectedBehaviors();
      if (detectedBehaviors.length > 0) {
        detectedBehaviors.forEach(behavior => {
          console.log(`  • ${behavior.type}: ${(behavior.confidence * 100).toFixed(1)}% confidence`);
        });
      } else {
        console.log('  • No emergent behaviors detected yet');
      }

      console.log('\n⚡ Collective Intelligence:');
      const collectiveKnowledge = this.collectiveIntelligence.getCollectiveKnowledge();
      if (collectiveKnowledge.size > 0) {
        console.log(`  • Knowledge Items: ${collectiveKnowledge.size}`);
        console.log(`  • Consensus Level: ${(this.calculateConvergence() * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.error('❌ Failed to generate analytics:', error.message);
    }
  }

  calculateAverageConnections() {
    let totalConnections = 0;
    for (const agent of this.agents) {
      const connections = this.networkManager.getAgentConnections(agent.id);
      totalConnections += connections ? connections.length : 0;
    }
    return this.agents.length > 0 ? (totalConnections / this.agents.length).toFixed(1) : 0;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up resources...');

    try {
      if (this.swarmCoordinator) await this.swarmCoordinator.cleanup();
      if (this.agentCommunication) await this.agentCommunication.cleanup();
      if (this.behaviorDetector) await this.behaviorDetector.cleanup();
      if (this.collectiveIntelligence) await this.collectiveIntelligence.cleanup();
      if (this.networkManager) await this.networkManager.cleanup();
      if (this.analytics) await this.analytics.cleanup();

      // Cleanup agent communications
      for (const agent of this.agents) {
        if (agent.communication) await agent.communication.cleanup();
      }

      console.log('✅ Cleanup completed\n');
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
    }
  }

  async run() {
    console.log('🐝 Swarm Learning Architecture Demo\n');
    console.log('=' .repeat(50));

    try {
      // Initialize system
      const initialized = await this.initialize();
      if (!initialized) return false;

      // Create swarm
      const swarmId = await this.createSwarm();
      if (!swarmId) return false;

      // Register agents
      await this.registerAgents(8);

      // Start learning
      await this.startLearning();

      // Demonstrate emergent behaviors
      await this.demonstrateEmergentBehaviors();

      // Show analytics
      await this.showAnalytics();

      console.log('🎉 Demo completed successfully!\n');
      console.log('=' .repeat(50));
      console.log('Key Achievements:');
      console.log('✅ Decentralized coordination established');
      console.log('✅ Agents collaborating without central control');
      console.log('✅ Emergent intelligence demonstrated');
      console.log('✅ Self-organizing network active');
      console.log('✅ Collective intelligence aggregated');
      console.log('✅ Real-time analytics and monitoring');

      return true;

    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }
}

// Run the demo
if (require.main === module) {
  const demo = new SwarmLearningDemo();
  demo.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = SwarmLearningDemo;
