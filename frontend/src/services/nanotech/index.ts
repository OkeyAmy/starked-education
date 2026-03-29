/**
 * Nanotechnology Learning System - Service Exports
 * Central point for importing all nanotechnology services
 */

// Core services
export {
  getNeuralInterfaceService,
  resetNeuralInterfaceService,
  type NeuralInterfaceService
} from './neuralInterface';

export {
  getNanobotControllerService,
  resetNanobotControllerService,
  type NanobotControllerService
} from './nanobotController';

export {
  getSkillTrackerService,
  resetSkillTrackerService,
  type SkillTrackerService
} from './skillTracker';

export {
  getSafetyMonitorService,
  resetSafetyMonitorService,
  type SafetyMonitorService
} from './safetyMonitor';

export {
  getKnowledgeEncoderService,
  resetKnowledgeEncoderService,
  type KnowledgeEncoderService
} from './knowledgeEncoder';

export {
  getLearningProfileService,
  resetLearningProfileService,
  type LearningProfileService
} from './learningProfile';

// Main protocol orchestrator
export {
  getLearningProtocolService,
  resetLearningProtocolService,
  type LearningProtocolService
} from './learningProtocol';

/**
 * Helper function to initialize all services for a user
 */
export function initializeNanotechServices(userId: string) {
  return {
    neuralInterface: () => getNeuralInterfaceService(userId),
    nanobot: getNanobotControllerService,
    skillTracker: () => getSkillTrackerService(userId),
    safety: getSafetyMonitorService,
    knowledge: getKnowledgeEncoderService,
    profile: getLearningProfileService,
    protocol: () => getLearningProtocolService(userId)
  };
}

/**
 * Helper function to reset all services
 */
export function resetAllNanotechServices() {
  resetNeuralInterfaceService();
  resetNanobotControllerService();
  resetSkillTrackerService();
  resetSafetyMonitorService();
  resetKnowledgeEncoderService();
  resetLearningProfileService();
  resetLearningProtocolService();
}
