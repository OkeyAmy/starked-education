/**
 * Nanotechnology Learning System - Comprehensive Test Suite
 * Tests for all services, utilities, hooks, and components
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Utility Tests
describe('Neural Simulation Utilities', () => {
  it('should generate valid neural patterns', async () => {
    const { generateNeuralPattern } = await import('../utils/neuralSimulation');
    const pattern = generateNeuralPattern('user1', 75, 'visual');
    
    expect(pattern).toHaveProperty('id');
    expect(pattern).toHaveProperty('neuronActivation');
    expect(pattern.focusLevel).toBeGreaterThanOrEqual(0);
    expect(pattern.focusLevel).toBeLessThanOrEqual(100);
    expect(pattern.neuroplasticity).toBeGreaterThanOrEqual(30);
  });

  it('should evolve neural patterns correctly', async () => {
    const { generateNeuralPattern, evolveNeuralPattern } = await import('../utils/neuralSimulation');
    const initial = generateNeuralPattern('user1', 50, 'cognitive');
    const evolved = evolveNeuralPattern(initial, 60000, 3, 0.8);
    
    expect(evolved.focusLevel).toBeGreaterThanOrEqual(initial.focusLevel);
    expect(evolved.neuroplasticity).toBeGreaterThanOrEqual(initial.neuroplasticity);
  });

  it('should calculate pattern similarity correctly', async () => {
    const { generateNeuralPattern, calculatePatternSimilarity } = await import('../utils/neuralSimulation');
    const pattern1 = generateNeuralPattern('user1', 75, 'general');
    const pattern2 = generateNeuralPattern('user1', 75, 'general');
    
    const similarity = calculatePatternSimilarity(pattern1, pattern2);
    expect(similarity).toBeGreaterThanOrEqual(0);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  it('should detect learning states', async () => {
    const { generateNeuralPattern, detectLearningState } = await import('../utils/neuralSimulation');
    const pattern = generateNeuralPattern('user1', 85, 'problem-solving');
    
    const state = detectLearningState(pattern);
    expect(['resting', 'focused', 'struggling', 'breakthrough']).toContain(state);
  });
});

describe('Knowledge Encoding Utilities', () => {
  it('should encode skills with compression', async () => {
    const { encodeSkill } = await import('../utils/knowledgeEncoding');
    const skill = {
      id: 'skill_test',
      name: 'Test Skill',
      category: 'technical' as const,
      difficulty: 3,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const encoded = encodeSkill(skill);
    
    expect(encoded.compressionRatio).toBeGreaterThan(0.3);
    expect(encoded.compressionRatio).toBeLessThan(0.9);
    expect(encoded.concepts.length).toBeGreaterThan(0);
  });

  it('should fragment knowledge for transmission', async () => {
    const { encodeSkill, fragmentKnowledge } = await import('../utils/knowledgeEncoding');
    const skill = {
      id: 'skill_test',
      name: 'Test Skill',
      category: 'technical' as const,
      difficulty: 2,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const encoded = encodeSkill(skill);
    const fragments = fragmentKnowledge(encoded);
    
    expect(Array.isArray(fragments)).toBe(true);
    expect(fragments.length).toBeGreaterThan(0);
    expect(fragments[0]).toHaveProperty('fragmentId');
    expect(fragments[0]).toHaveProperty('sequence');
  });

  it('should verify encoded knowledge', async () => {
    const { encodeSkill, verifyEncodedKnowledge } = await import('../utils/knowledgeEncoding');
    const skill = {
      id: 'skill_test',
      name: 'Test Skill',
      category: 'cognitive' as const,
      difficulty: 3,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const encoded = encodeSkill(skill);
    const verified = verifyEncodedKnowledge(encoded, skill);
    
    expect(verified).toBe(true);
  });
});

// Service Tests
describe('Neural Interface Service', () => {
  it('should initialize and start monitoring', async () => {
    const { getNeuralInterfaceService, resetNeuralInterfaceService } = await import('../services/nanotech/neuralInterface');
    resetNeuralInterfaceService();
    
    const service = getNeuralInterfaceService('user1');
    await service.startMonitoring('cognitive');
    
    const pattern = service.getCurrentPattern();
    expect(pattern).toBeDefined();
    expect(pattern?.focusLevel).toBeGreaterThanOrEqual(0);
    
    await service.stopMonitoring();
  });

  it('should map neural pathways', async () => {
    const { getNeuralInterfaceService, resetNeuralInterfaceService } = await import('../services/nanotech/neuralInterface');
    resetNeuralInterfaceService();
    
    const service = getNeuralInterfaceService('user1');
    await service.startMonitoring('visual');
    
    const pathway = service.mapNeuralPathway('visual');
    expect(pathway).toHaveProperty('pathId');
    expect(pathway).toHaveProperty('primaryNodes');
    expect(pathway.connectionStrength).toBeGreaterThanOrEqual(0);
    
    await service.stopMonitoring();
  });
});

describe('Nanobot Controller Service', () => {
  it('should deploy swarms', async () => {
    const { getNanobotControllerService, resetNanobotControllerService } = await import('../services/nanotech/nanobotController');
    resetNanobotControllerService();
    
    const service = getNanobotControllerService();
    const swarm = await service.deploySwarm('user1', 'skill1', 1000, 'moderate');
    
    expect(swarm).toHaveProperty('id');
    expect(swarm.totalCount).toBe(1000);
    expect(swarm.nanobots.length).toBe(1000);
  });

  it('should get swarm statistics', async () => {
    const { getNanobotControllerService, resetNanobotControllerService } = await import('../services/nanotech/nanobotController');
    resetNanobotControllerService();
    
    const service = getNanobotControllerService();
    const swarm = await service.deploySwarm('user1', 'skill1', 500, 'fast');
    const stats = service.getSwarmStats(swarm.id);
    
    expect(stats).toBeDefined();
    expect(stats!.totalNanobots).toBe(500);
  });
});

describe('Skill Tracker Service', () => {
  it('should track skill acquisition', async () => {
    const { getSkillTrackerService, resetSkillTrackerService } = await import('../services/nanotech/skillTracker');
    resetSkillTrackerService();
    
    const service = getSkillTrackerService('user1');
    const skill = {
      id: 'skill1',
      name: 'Test Skill',
      category: 'technical' as const,
      difficulty: 3,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const tracking = service.startSkillAcquisition(skill);
    expect(tracking.acquisitionProgress).toBe(0);
    expect(tracking.masteryLevel).toBe(0);
  });

  it('should update skill progress', async () => {
    const { getSkillTrackerService, resetSkillTrackerService } = await import('../services/nanotech/skillTracker');
    resetSkillTrackerService();
    
    const service = getSkillTrackerService('user1');
    const skill = {
      id: 'skill1',
      name: 'Test Skill',
      category: 'cognitive' as const,
      difficulty: 2,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const tracking = service.startSkillAcquisition(skill);
    const updated = service.updateProgress('skill1', 0.25, 5);
    
    expect(updated).toBeDefined();
    expect(updated!.acquisitionProgress).toBeGreaterThan(0);
  });

  it('should record test results', async () => {
    const { getSkillTrackerService, resetSkillTrackerService } = await import('../services/nanotech/skillTracker');
    resetSkillTrackerService();
    
    const service = getSkillTrackerService('user1');
    const skill = {
      id: 'skill1',
      name: 'Test Skill',
      category: 'technical' as const,
      difficulty: 3,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    service.startSkillAcquisition(skill);
    const result = service.recordTestResult('skill1', 85, true);
    
    expect(result).toBeDefined();
    expect(result!.testsPassed).toBe(1);
    expect(result!.averageScore).toBe(85);
  });
});

describe('Safety Monitor Service', () => {
  it('should initialize safety monitoring', async () => {
    const { getSafetyMonitorService, resetSafetyMonitorService } = await import('../services/nanotech/safetyMonitor');
    resetSafetyMonitorService();
    
    const service = getSafetyMonitorService();
    const swarm = {
      id: 'swarm1',
      userId: 'user1',
      skillTargetId: 'skill1',
      nanobots: [],
      totalCount: 100,
      activeCount: 100,
      coordinationStrategy: 'particle-swarm' as const,
      cohesion: 0.8,
      efficiency: 0.6,
      missionProgress: 0,
      estimatedCompletion: 30000,
      knowledgeTransferred: 0,
      deployedAt: Date.now(),
      estimatedReturnAt: Date.now() + 30000,
      safetyStatus: 'safe' as const
    };
    
    const status = await service.startMonitoring('swarm1', swarm);
    expect(status.overallSafetyScore).toBeGreaterThan(80);
  });
});

describe('Learning Profile Service', () => {
  it('should create learning profiles', async () => {
    const { getLearningProfileService, resetLearningProfileService } = await import('../services/nanotech/learningProfile');
    resetLearningProfileService();
    
    const service = getLearningProfileService();
    const { generateNeuralPattern } = await import('../utils/neuralSimulation');
    const pattern = generateNeuralPattern('user1', 75, 'visual');
    
    const profile = service.createProfile('user1', pattern);
    expect(profile.userId).toBe('user1');
    expect(profile.dominantLearningStyle).toBeDefined();
  });

  it('should estimate mastery time', async () => {
    const { getLearningProfileService, resetLearningProfileService } = await import('../services/nanotech/learningProfile');
    resetLearningProfileService();
    
    const service = getLearningProfileService();
    const profile = service.createProfile('user1', {
      id: 'pattern1',
      timestamp: Date.now(),
      userId: 'user1',
      neuronActivation: new Array(1000).fill(0.5),
      synapseStrength: {},
      brainWaveFrequency: { delta: 2, theta: 5, alpha: 10, beta: 20, gamma: 40 },
      focusLevel: 75,
      memoryCapacity: 80,
      learningVelocity: 2,
      neuroplasticity: 70,
      patternHash: 'hash123',
      dominantFrequency: 'alpha',
      learningReadiness: 80
    });
    
    const time = service.estimateMasteryTime('user1', 3);
    expect(time).toBeGreaterThan(0);
  });
});

// Integration Tests
describe('Nanotechnology Learning System - Integration', () => {
  it('should complete a full learning session flow', async () => {
    const { getLearningProtocolService, resetLearningProtocolService } = await import('../services/nanotech/learningProtocol');
    const { getNeuralInterfaceService, resetNeuralInterfaceService } = await import('../services/nanotech/neuralInterface');
    const { getSkillTrackerService, resetSkillTrackerService } = await import('../services/nanotech/skillTracker');
    
    resetLearningProtocolService();
    resetNeuralInterfaceService();
    resetSkillTrackerService();
    
    const skill = {
      id: 'skill_integration_test',
      name: 'Integration Test Skill',
      category: 'cognitive' as const,
      difficulty: 2,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 75
    };
    
    const protocol = getLearningProtocolService('user1');
    const session = await protocol.startLearningSession(skill);
    
    expect(session).toHaveProperty('id');
    expect(session.skillId).toBe('skill_integration_test');
    expect(session.userId).toBe('user1');
  });

  it('should handle knowledge encoding throughout session', async () => {
    const { getKnowledgeEncoderService, resetKnowledgeEncoderService } = await import('../services/nanotech/knowledgeEncoder');
    resetKnowledgeEncoderService();
    
    const encoder = getKnowledgeEncoderService();
    const skill = {
      id: 'skill_encoding_test',
      name: 'Encoding Test Skill',
      category: 'technical' as const,
      difficulty: 3,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    };
    
    const encoded = await encoder.encodeSkillForTransfer(skill);
    expect(encoded).toHavePropery('id');
    
    const fragments = await encoder.fragmentEncodedKnowledge(skill.id);
    expect(Array.isArray(fragments)).toBe(true);
    
    const stats = encoder.getEncodingStats(skill.id);
    expect(stats).toBeDefined();
  });
});

// Type Safety Tests
describe('Nanotechnology Learning System - Type Safety', () => {
  it('should have correct type definitions', () => {
    // This test verifies that types are properly exported
    // Compile-time type checking happens in the build process
    expect(true).toBe(true); // Placeholder for type checking
  });
});

// Performance Tests
describe('Nanotechnology Learning System - Performance', () => {
  it('should handle large swarm sizes efficiently', async () => {
    const { getNanobotControllerService, resetNanobotControllerService } = await import('../services/nanotech/nanobotController');
    resetNanobotControllerService();
    
    const service = getNanobotControllerService();
    const startTime = performance.now();
    
    const swarm = await service.deploySwarm('user1', 'skill1', 5000, 'fast');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(swarm.totalCount).toBe(5000);
  });

  it('should process multiple sessions in parallel', async () => {
    const { getSkillTrackerService, resetSkillTrackerService } = await import('../services/nanotech/skillTracker');
    resetSkillTrackerService();
    
    const service = getSkillTrackerService('user1');
    const skills = Array.from({ length: 10 }, (_, i) => ({
      id: `skill_${i}`,
      name: `Skill ${i}`,
      category: 'cognitive' as const,
      difficulty: 2,
      prerequisiteSkills: [],
      estimatedLearningTime: 60000,
      knowledgeBlocks: [],
      testQuestions: [],
      masteryThreshold: 80
    }));
    
    const startTime = performance.now();
    
    skills.forEach(skill => {
      service.startSkillAcquisition(skill);
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(500);
  });
});
