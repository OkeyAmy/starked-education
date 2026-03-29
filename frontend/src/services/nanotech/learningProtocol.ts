/**
 * Main Nanotechnology Learning Protocol Service
 * Orchestrates all service interactions for coordinated knowledge transfer
 * Manages lifecycle of learning sessions and integrates all components
 */

import { getNeuralInterfaceService } from './neuralInterface';
import { getNanobotControllerService } from './nanobotController';
import { getSkillTrackerService } from './skillTracker';
import { getSafetyMonitorService } from './safetyMonitor';
import { getKnowledgeEncoderService } from './knowledgeEncoder';
import { getLearningProfileService } from './learningProfile';

import type { Skill, LearningSession } from '../types/nanotech';

/**
 * Singleton instance
 */
let instance: LearningProtocolService | null = null;

/**
 * Learning Protocol Service - Main Orchestrator
 */
class LearningProtocolService {
  private userId: string;
  private activeSession: LearningSession | null = null;
  private sessionHistory: LearningSession[] = [];
  private listeners: Map<string, Set<Function>> = new Map();

  // Service references
  private neuralInterface = getNeuralInterfaceService;
  private nanobotController = getNanobotControllerService;
  private skillTracker = getSkillTrackerService;
  private safetyMonitor = getSafetyMonitorService;
  private knowledgeEncoder = getKnowledgeEncoderService;
  private learningProfile = getLearningProfileService;

  constructor(userId: string) {
    this.userId = userId;
    this.registerListeners();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'sessionStarted',
      'sessionPhaseChange',
      'knowledgeTransferProgress',
      'sessionCompleted',
      'sessionError'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to protocol events
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
    };
  }

  /**
   * Emit events
   */
  private emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  /**
   * Initiate complete learning session
   */
  async startLearningSession(
    skill: Skill,
    sessionOptions?: {
      difficulty?: number;
      speed?: 'slow' | 'moderate' | 'fast' | 'maximum';
      swarmSize?: number;
    }
  ): Promise<LearningSession> {
    try {
      // Get or create user profile
      const profileService = this.learningProfile();
      let profile = profileService.getProfile(this.userId);

      // Initialize services
      const neuralService = this.neuralInterface(this.userId);
      const trackerService = this.skillTracker(this.userId);
      const controllerService = this.nanobotController();
      const safetyService = this.safetyMonitor();
      const encoderService = this.knowledgeEncoder();

      // Phase 1: Neural baseline assessment
      this.emit('sessionPhaseChange', {
        phase: 'neural_assessment',
        timestamp: Date.now()
      });

      // Start neural monitoring
      await neuralService.startMonitoring(skill.category);
      const initialNeuralPattern = neuralService.getCurrentPattern();

      if (!initialNeuralPattern) {
        throw new Error('Failed to establish neural baseline');
      }

      // Create profile if not exists
      if (!profile) {
        profile = profileService.createProfile(this.userId, initialNeuralPattern);
      } else {
        profileService.updateProfileWithNeuralData(this.userId, initialNeuralPattern);
      }

      // Phase 2: Knowledge encoding
      this.emit('sessionPhaseChange', {
        phase: 'knowledge_encoding',
        timestamp: Date.now()
      });

      const encoded = await encoderService.encodeSkillForTransfer(skill);
      await encoderService.fragmentEncodedKnowledge(skill.id);

      // Phase 3: Skill acquisition tracking
      const skillTracking = trackerService.startSkillAcquisition(
        skill,
        undefined // Swarm ID will be set after deployment
      );

      // Phase 4: Nanobot deployment
      this.emit('sessionPhaseChange', {
        phase: 'nanobot_deployment',
        timestamp: Date.now()
      });

      const swarmSize = sessionOptions?.swarmSize || profile.preferredSwarmSize;
      const transferSpeed = sessionOptions?.speed || profile.preferredTransferSpeed;

      const swarm = await controllerService.deploySwarm(
        this.userId,
        skill.id,
        swarmSize,
        transferSpeed
      );

      skillTracking.currentNanobotSwarmId = swarm.id;

      // Phase 5: Safety monitoring
      await safetyService.startMonitoring(swarm.id, swarm);

      // Create session record
      const session: LearningSession = {
        id: `session_${skill.id}_${Date.now()}`,
        userId: this.userId,
        skillId: skill.id,
        startedAt: Date.now(),
        completedAt: undefined,
        duration: undefined,
        initialNeuralPattern,
        finalNeuralPattern: undefined,
        neuroplasticityGain: undefined,
        nanobotSwarmId: swarm.id,
        knowledgeTransferred: 0,
        transferSpeed: swarmSize / 100, // Simplified speed calculation
        skillProgress: 0,
        testScore: undefined,
        successStatus: 'pending',
        safetyStatus: await safetyService.getSafetyStatus(swarm.id) || 
                     { swarmId: swarm.id, timestamp: Date.now(), neurotoxicity: 0, 
                       inflammationLevel: 0, immuneResponse: 0, nanobotContainment: 100,
                       escapeDetections: 0, recoverySuccessRate: 100, systemIntegrity: 100,
                       errorRate: 0, overallSafetyScore: 100, status: 'safe', recommendations: [] },
        incidents: []
      };

      this.activeSession = session;

      this.emit('sessionStarted', {
        sessionId: session.id,
        skillId: skill.id,
        skillName: skill.name,
        swarmId: swarm.id,
        estimatedDuration: swarm.estimatedCompletion,
        timestamp: Date.now()
      });

      // Start monitoring loop
      this.monitorSessionProgress();

      return session;
    } catch (error) {
      this.emit('sessionError', {
        userId: this.userId,
        skillId: skill.id,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      });

      throw error;
    }
  }

  /**
   * Monitor session progress
   */
  private monitorSessionProgress(): void {
    if (!this.activeSession) return;

    const monitorInterval = setInterval(async () => {
      if (!this.activeSession) {
        clearInterval(monitorInterval);
        return;
      }

      try {
        const controllerService = this.nanobotController();
        const trackerService = this.skillTracker(this.userId);
        const profileService = this.learningProfile();
        const neuralService = this.neuralInterface(this.userId);

        // Get swarm status
        const swarmStatus = controllerService.getSwarmStatus(this.activeSession.nanobotSwarmId);
        if (!swarmStatus) {
          clearInterval(monitorInterval);
          return;
        }

        // Update session progress
        this.activeSession.knowledgeTransferred = swarmStatus.knowledgeTransferred;
        this.activeSession.skillProgress = swarmStatus.missionProgress;

        // Update skill tracking
        const skillTracking = trackerService.getSkillTracking(this.activeSession.skillId);
        if (skillTracking) {
          trackerService.updateProgress(
            this.activeSession.skillId,
            (swarmStatus.knowledgeTransferred - skillTracking.acquisitionProgress) / 100,
            (neuralService.getCurrentPattern()?.neuroplasticity || 0) - 
              (this.activeSession.initialNeuralPattern.neuroplasticity || 0)
          );
        }

        // Emit progress
        this.emit('knowledgeTransferProgress', {
          sessionId: this.activeSession.id,
          progress: this.activeSession.skillProgress,
          knowledgeTransferred: this.activeSession.knowledgeTransferred,
          activeNanobots: swarmStatus.activeCount,
          timestamp: Date.now()
        });

        // Check if session is complete
        if (swarmStatus.missionProgress >= 100) {
          clearInterval(monitorInterval);
          await this.completeSession();
        }
      } catch (error) {
        console.error('Error monitoring session:', error);
        clearInterval(monitorInterval);
      }
    }, 1000); // Check every second
  }

  /**
   * Complete learning session
   */
  private async completeSession(): Promise<void> {
    if (!this.activeSession) return;

    try {
      const trackerService = this.skillTracker(this.userId);
      const neuralService = this.neuralInterface(this.userId);
      const profileService = this.learningProfile();

      // Get final neural pattern
      await neuralService.simulateAdaptation(
        this.activeSession.duration || (Date.now() - this.activeSession.startedAt),
        2, // Mid-difficulty
        0.8 // Good success rate
      );

      const finalPattern = neuralService.getCurrentPattern();

      this.activeSession.completedAt = Date.now();
      this.activeSession.duration = this.activeSession.completedAt - this.activeSession.startedAt;
      this.activeSession.finalNeuralPattern = finalPattern || undefined;

      if (finalPattern && this.activeSession.initialNeuralPattern) {
        this.activeSession.neuroplasticityGain =
          finalPattern.neuroplasticity - this.activeSession.initialNeuralPattern.neuroplasticity;
      }

      // Record skill acquisition
      const skillTracking = trackerService.getSkillTracking(this.activeSession.skillId);
      if (skillTracking) {
        profileService.recordSkillAcquisition(
          this.userId,
          this.activeSession.skillId,
          skillTracking.masteryLevel
        );

        this.activeSession.successStatus = 'success';
      }

      // Store session
      this.sessionHistory.push(this.activeSession);

      this.emit('sessionCompleted', {
        sessionId: this.activeSession.id,
        duration: this.activeSession.duration,
        skillProgress: this.activeSession.skillProgress,
        neuroplasticityGain: this.activeSession.neuroplasticityGain,
        timestamp: Date.now()
      });

      // Stop neural monitoring
      await neuralService.stopMonitoring();

      this.activeSession = null;
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }

  /**
   * Get active session
   */
  getActiveSession(): LearningSession | null {
    return this.activeSession;
  }

  /**
   * Get session history
   */
  getSessionHistory(limit: number = 50): LearningSession[] {
    return this.sessionHistory.slice(-limit);
  }

  /**
   * Emergency session abort
   */
  async abortSession(reason: string = 'User requested'): Promise<void> {
    if (!this.activeSession) return;

    const controllerService = this.nanobotController();
    const safetyService = this.safetyMonitor();

    // Shutdown swarm
    await controllerService.shutdownSwarm(this.activeSession.nanobotSwarmId);

    // Emergency containment
    await safetyService.emergencyShutdown(this.activeSession.nanobotSwarmId);

    this.activeSession.successStatus = 'failed';
    this.activeSession.incidents.push(`Session aborted: ${reason}`);

    this.emit('sessionError', {
      sessionId: this.activeSession.id,
      reason,
      timestamp: Date.now()
    });

    this.activeSession = null;
  }

  /**
   * Get learning statistics
   */
  getStatistics(): {
    totalSessions: number;
    completedSessions: number;
    totalLearningTime: number;
    averageSessionDuration: number;
    skillsAcquired: number;
  } {
    const completed = this.sessionHistory.filter(s => s.successStatus === 'success').length;
    const totalTime = this.sessionHistory.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgDuration = completed > 0 ? totalTime / completed : 0;

    return {
      totalSessions: this.sessionHistory.length,
      completedSessions: completed,
      totalLearningTime: totalTime,
      averageSessionDuration: avgDuration,
      skillsAcquired: this.learningProfile().getProfile(this.userId)?.totalSkillsAcquired || 0
    };
  }

  /**
   * Reset service
   */
  reset(): void {
    this.activeSession = null;
    this.sessionHistory = [];
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getLearningProtocolService(userId: string): LearningProtocolService {
  if (!instance) {
    instance = new LearningProtocolService(userId);
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetLearningProtocolService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { LearningProtocolService };
