/**
 * Skill Tracker Service
 * Tracks user's skill acquisition progress, performance metrics, and verification status
 */

import type { Skill, SkillTracking } from '../types/nanotech';

/**
 * Singleton instance
 */
let instance: SkillTrackerService | null = null;

/**
 * Skill Tracker Service
 */
class SkillTrackerService {
  private userId: string;
  private skillTrackings: Map<string, SkillTracking> = new Map();
  private sessionMetrics: Map<string, { duration: number; startTime: number }> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(userId: string) {
    this.userId = userId;
    this.registerListeners();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'skillStarted',
      'progressUpdated',
      'testCompleted',
      'skillMastered',
      'verificationCompleted'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to tracker events
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
   * Initiate skill acquisition tracking
   */
  startSkillAcquisition(skill: Skill, swarmId?: string): SkillTracking {
    const tracking: SkillTracking = {
      userId: this.userId,
      skillId: skill.id,
      acquisitionProgress: 0,
      masteryLevel: 0,
      proficiency: 0,
      testsPassed: 0,
      testsFailed: 0,
      averageScore: 0,
      currentNanobotSwarmId: swarmId,
      transferStartedAt: Date.now(),
      transferCompletedAt: undefined,
      neuroplasticityGain: 0,
      verified: false,
      verificationDate: undefined,
      certificateId: undefined
    };

    this.skillTrackings.set(skill.id, tracking);
    this.sessionMetrics.set(skill.id, {
      duration: 0,
      startTime: Date.now()
    });

    this.emit('skillStarted', {
      skillId: skill.id,
      skillName: skill.name,
      difficulty: skill.difficulty,
      timestamp: Date.now()
    });

    return tracking;
  }

  /**
   * Update skill acquisition progress
   */
  updateProgress(
    skillId: string,
    progressDelta: number, // 0-1 increment
    neuroplasticityGain: number = 0
  ): SkillTracking | null {
    const tracking = this.skillTrackings.get(skillId);
    if (!tracking) {
      console.warn(`Tracking not found for skill ${skillId}`);
      return null;
    }

    // Update progress
    tracking.acquisitionProgress = Math.min(
      100,
      tracking.acquisitionProgress + progressDelta * 100
    );

    // Update proficiency based on progress
    tracking.proficiency = tracking.acquisitionProgress / 100;

    // Update mastery level (accelerated with neural adaptation)
    const neuroplasticityBoost = (neuroplasticityGain / 100) * 0.3;
    tracking.masteryLevel = Math.min(
      100,
      tracking.masteryLevel + progressDelta * 50 + neuroplasticityBoost * 50
    );

    // Apply neuroplasticity gains
    tracking.neuroplasticityGain += neuroplasticityGain;

    this.emit('progressUpdated', {
      skillId,
      progress: tracking.acquisitionProgress,
      mastery: tracking.masteryLevel,
      proficiency: tracking.proficiency
    });

    return tracking;
  }

  /**
   * Record test completion
   */
  recordTestResult(
    skillId: string,
    score: number, // 0-100
    passed: boolean
  ): SkillTracking | null {
    const tracking = this.skillTrackings.get(skillId);
    if (!tracking) {
      console.warn(`Tracking not found for skill ${skillId}`);
      return null;
    }

    // Update test metrics
    if (passed) {
      tracking.testsPassed++;
    } else {
      tracking.testsFailed++;
    }

    const totalTests = tracking.testsPassed + tracking.testsFailed;
    tracking.averageScore = (tracking.averageScore * (totalTests - 1) + score) / totalTests;

    // Increase skill progress based on test performance
    if (passed) {
      const progressGain = (score / 100) * 0.25; // Up to 25% progress per test
      this.updateProgress(skillId, progressGain, score / 100 * 5); // Neuroplasticity bonus
    } else {
      // Smaller gain from failed test but still contribute to learning
      this.updateProgress(skillId, 0.05, 2);
    }

    this.emit('testCompleted', {
      skillId,
      score,
      passed,
      totalTests,
      averageScore: tracking.averageScore
    });

    return tracking;
  }

  /**
   * Check if skill is mastered
   */
  checkMastery(skill: Skill, tracking: SkillTracking): boolean {
    // Mastery achieved when:
    // 1. 80%+ acquisition progress
    // 2. Mastery level > 80
    // 3. Passed threshold tests
    const passedRequiredTests = (tracking.testsPassed / Math.max(1, tracking.testsPassed + tracking.testsFailed)) >= 0.8;
    const averageScoreHigh = tracking.averageScore >= 75;
    const hasRequiredMastery = tracking.masteryLevel >= 80;

    return (
      tracking.acquisitionProgress >= 80 &&
      hasRequiredMastery &&
      (passedRequiredTests || averageScoreHigh)
    );
  }

  /**
   * Verify and certify skill mastery
   */
  async verifySkillMastery(skillId: string, skill: Skill): Promise<boolean> {
    const tracking = this.skillTrackings.get(skillId);
    if (!tracking) {
      console.warn(`Tracking not found for skill ${skillId}`);
      return false;
    }

    const isMastered = this.checkMastery(skill, tracking);

    if (isMastered) {
      // Generate certificate
      const certificateId = `cert_${skillId}_${Date.now()}`;
      tracking.verified = true;
      tracking.verificationDate = Date.now();
      tracking.certificateId = certificateId;
      tracking.transferCompletedAt = Date.now();

      // Calculate session duration
      const sessionMetric = this.sessionMetrics.get(skillId);
      if (sessionMetric) {
        sessionMetric.duration = Date.now() - sessionMetric.startTime;
      }

      this.emit('skillMastered', {
        skillId,
        skillName: skill.name,
        masteryLevel: tracking.masteryLevel,
        certificateId,
        completionTime: tracking.transferCompletedAt - (tracking.transferStartedAt || 0)
      });

      this.emit('verificationCompleted', {
        skillId,
        verified: true,
        certificateId,
        masteryScore: tracking.masteryLevel
      });
    } else {
      this.emit('verificationCompleted', {
        skillId,
        verified: false,
        reason: 'Mastery criteria not met',
        progress: tracking.acquisitionProgress,
        masteryLevel: tracking.masteryLevel,
        testPassRate: tracking.testsPassed / Math.max(1, tracking.testsPassed + tracking.testsFailed)
      });
    }

    return isMastered;
  }

  /**
   * Get skill tracking progress
   */
  getSkillTracking(skillId: string): SkillTracking | null {
    return this.skillTrackings.get(skillId) || null;
  }

  /**
   * Get all tracked skills
   */
  getAllTrackedSkills(): SkillTracking[] {
    return Array.from(this.skillTrackings.values());
  }

  /**
   * Get acquired skills (verified/mastered)
   */
  getAcquiredSkills(): SkillTracking[] {
    return Array.from(this.skillTrackings.values()).filter(t => t.verified);
  }

  /**
   * Get skill statistics
   */
  getSkillStats(skillId: string): {
    acquisitionProgress: number;
    masteryLevel: number;
    testPassRate: number;
    averageScore: number;
    estimatedTimeToMastery: number;
  } | null {
    const tracking = this.skillTrackings.get(skillId);
    if (!tracking) {
      return null;
    }

    const totalTests = tracking.testsPassed + tracking.testsFailed;
    const testPassRate = totalTests > 0 ? tracking.testsPassed / totalTests : 0;

    // Estimate time to mastery based on current progress
    const remainingProgress = 100 - tracking.acquisitionProgress;
    const currentSpeed = tracking.acquisitionProgress / Math.max(1, (Date.now() - (tracking.transferStartedAt || 0)) / 60000); // progress per minute

    let estimatedTime = Infinity;
    if (currentSpeed > 0) {
      estimatedTime = Math.round((remainingProgress / currentSpeed) * 60000); // in ms
    }

    return {
      acquisitionProgress: tracking.acquisitionProgress,
      masteryLevel: tracking.masteryLevel,
      testPassRate,
      averageScore: tracking.averageScore,
      estimatedTimeToMastery: estimatedTime
    };
  }

  /**
   * Get adaptive learning recommendations
   */
  getRecommendations(skillId: string): {
    focusAreas: string[];
    practiceAreas: string[];
    nextSteps: string[];
  } | null {
    const tracking = this.skillTrackings.get(skillId);
    if (!tracking) {
      return null;
    }

    const focusAreas: string[] = [];
    const practiceAreas: string[] = [];
    const nextSteps: string[] = [];

    // Analyze performance
    if (tracking.acquisitionProgress < 40) {
      focusAreas.push('Foundation concepts need reinforcement');
      practiceAreas.push('Review prerequisite concepts');
      practiceAreas.push('Complete basic exercises');
    }

    if (tracking.testsPassed < tracking.testsFailed) {
      focusAreas.push('Test performance needs improvement');
      practiceAreas.push('Practice with more test questions');
      practiceAreas.push('Focus on weak concept areas');
    }

    if (tracking.averageScore < 70) {
      focusAreas.push('Higher score accuracy needed');
      practiceAreas.push('Review detailed solutions');
    }

    // Next steps
    if (tracking.acquisitionProgress < 80) {
      nextSteps.push('Continue knowledge transfer');
      nextSteps.push('Complete more tests');
    } else if (!tracking.verified) {
      nextSteps.push('Attempt verification test');
      nextSteps.push('Review final concepts');
    } else {
      nextSteps.push('Skill mastered! Consider advanced topics');
    }

    return {
      focusAreas,
      practiceAreas,
      nextSteps
    };
  }

  /**
   * Reset tracking session
   */
  resetSkillTracking(skillId: string): void {
    this.skillTrackings.delete(skillId);
    this.sessionMetrics.delete(skillId);
  }

  /**
   * Reset service
   */
  reset(): void {
    this.skillTrackings.clear();
    this.sessionMetrics.clear();
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getSkillTrackerService(userId: string): SkillTrackerService {
  if (!instance) {
    instance = new SkillTrackerService(userId);
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetSkillTrackerService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { SkillTrackerService };
