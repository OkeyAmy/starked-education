#!/usr/bin/env node

/**
 * Simple test script to verify swarm learning functionality
 * This script tests the core components without requiring npm/jest
 */

const path = require('path');

// Set up environment
process.env.NODE_ENV = 'test';

// Mock logger for testing
const mockLogger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`)
};

// Temporarily replace logger
const originalModule = require.cache[require.resolve('./src/utils/logger.js')];
if (originalModule) {
  originalModule.exports = mockLogger;
}

async function testSwarmLearning() {
  console.log('🐝 Testing Swarm Learning Architecture...\n');
  
  try {
    // Import swarm learning components
    const SwarmCoordinator = require('./src/services/swarmLearning/SwarmCoordinator');
    const AgentCommunication = require('./src/services/swarmLearning/AgentCommunication');
    const EmergentBehaviorDetector = require('./src/services/swarmLearning/EmergentBehaviorDetector');
    const CollectiveIntelligence = require('./src/services/swarmLearning/CollectiveIntelligence');
    const SelfOrganizingNetwork = require('./src/services/swarmLearning/SelfOrganizingNetwork');
    const SwarmAnalytics = require('./src/services/swarmLearning/SwarmAnalytics');
    
    console.log('✅ Successfully imported all swarm learning components\n');
    
    // Test 1: Initialize SwarmCoordinator
    console.log('📋 Test 1: SwarmCoordinator Initialization');
    const swarmCoordinator = new SwarmCoordinator({
      minAgents: 2,
      maxAgents: 10,
      communicationRadius: 3,
      convergenceThreshold: 0.1
    });
    
    const taskDefinition = {
      type: 'classification',
      description: 'Test classification task',
      complexity: 'medium'
    };
    
    const swarmId = await swarmCoordinator.initializeSwarm(taskDefinition);
    console.log(`✅ Swarm initialized with ID: ${swarmId}`);
    
    // Test 2: Register Agents
    console.log('\n📋 Test 2: Agent Registration');
    const agentIds = [];
    
    for (let i = 0; i < 3; i++) {
      const agentConfig = {
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
      };
      
      const agentId = await swarmCoordinator.registerAgent(agentConfig);
      agentIds.push(agentId);
      console.log(`✅ Agent registered: ${agentId}`);
    }
    
    // Test 3: Agent Communication
    console.log('\n📋 Test 3: Agent Communication');
    const agentCommunication = new AgentCommunication({
      encryptionEnabled: false,
      authenticationEnabled: false
    });
    
    await agentCommunication.initialize('test-agent');
    console.log('✅ Agent communication initialized');
    
    // Test 4: Emergent Behavior Detection
    console.log('\n📋 Test 4: Emergent Behavior Detection');
    const behaviorDetector = new EmergentBehaviorDetector({
      detectionWindow: 5000,
      minPatternOccurrences: 2,
      confidenceThreshold: 0.5
    });
    
    await behaviorDetector.initialize();
    
    // Record some sample observations
    for (let i = 0; i < 5; i++) {
      behaviorDetector.recordObservation({
        type: 'collaboration',
        agentId: agentIds[i % agentIds.length],
        behavior: 'knowledge_sharing',
        value: Math.random()
      });
    }
    
    console.log('✅ Behavior detector initialized and observations recorded');
    
    // Test 5: Collective Intelligence
    console.log('\n📋 Test 5: Collective Intelligence');
    const collectiveIntelligence = new CollectiveIntelligence({
      consensusThreshold: 0.5,
      diversityBonus: 0.1
    });
    
    await collectiveIntelligence.initialize();
    
    const agentKnowledge = [
      { agentId: agentIds[0], knowledge: { accuracy: 0.8, confidence: 0.9 } },
      { agentId: agentIds[1], knowledge: { accuracy: 0.7, confidence: 0.8 } },
      { agentId: agentIds[2], knowledge: { accuracy: 0.9, confidence: 0.7 } }
    ];
    
    const aggregatedKnowledge = collectiveIntelligence.aggregateAgentKnowledge(agentKnowledge, 'test-task');
    console.log('✅ Collective intelligence aggregated knowledge:', aggregatedKnowledge);
    
    // Test 6: Self-Organizing Network
    console.log('\n📋 Test 6: Self-Organizing Network');
    const networkManager = new SelfOrganizingNetwork({
      initialConnections: 2,
      maxConnections: 5,
      reorganizationInterval: 2000
    });
    
    await networkManager.initialize();
    
    // Add agents to network
    agentIds.forEach((agentId, index) => {
      networkManager.addAgent(agentId, { id: agentId, index });
    });
    
    console.log('✅ Self-organizing network initialized with agents');
    
    // Test 7: Swarm Analytics
    console.log('\n📋 Test 7: Swarm Analytics');
    const analytics = new SwarmAnalytics({
      metricsRetentionPeriod: 10000,
      aggregationInterval: 1000
    });
    
    await analytics.initialize();
    
    // Record some metrics
    analytics.recordMetric('swarm_size', agentIds.length);
    analytics.recordMetric('communication_efficiency', 0.85);
    analytics.recordMetric('learning_convergence', 0.78);
    
    console.log('✅ Analytics initialized and metrics recorded');
    
    // Test 8: Get Swarm Status
    console.log('\n📋 Test 8: Swarm Status');
    const swarmStatus = swarmCoordinator.getSwarmStatus();
    console.log('✅ Swarm status retrieved:');
    console.log(`   - Agents: ${swarmStatus.agents.size}`);
    console.log(`   - Active Tasks: ${swarmStatus.activeTasks.size}`);
    console.log(`   - Network Topology: ${Object.keys(swarmStatus.networkTopology).length} nodes`);
    
    // Cleanup
    console.log('\n📋 Test 9: Cleanup');
    await swarmCoordinator.cleanup();
    await agentCommunication.cleanup();
    await behaviorDetector.cleanup();
    await collectiveIntelligence.cleanup();
    await networkManager.cleanup();
    await analytics.cleanup();
    console.log('✅ All components cleaned up successfully');
    
    console.log('\n🎉 All tests passed! Swarm Learning Architecture is working correctly.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Run the test
testSwarmLearning().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
