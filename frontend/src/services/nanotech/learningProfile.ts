/**
 * Learning Profile Service
 * Manages user's personalized learning profiles, neural characteristics, and adaptive settings
 */

import type { LearningProfile, NeuralPattern } from '../types/nanotech';

/**
 * Singleton instance
 */
let instance: LearningProfileService | null = null;

/**
 * Learning Profile Service
 */
class LearningProfileService {
  private profiles: Map<string, LearningProfile> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();

  constructor() {
    this.registerListeners();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'profileCreated',
      'profileUpdated',
      'adaptationApplied',
      'recommendationsGenerated',
      'performanceAnalyzed'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to profile events
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
   * Create new learning profile from baseline neural pattern
   */
  createProfile(
    userId: string,
    baselineNeuralPattern: NeuralPattern
  ): LearningProfile {
    const learningStyle = this.determineLearningStyle(baselineNeuralPattern);

    const profile: LearningProfile = {
      userId,
      dominantLearningStyle: learningStyle,
      averageNeuroplasticity: baselineNeuralPattern.neuroplasticity,
      baselineNeuralPattern,
      averageLearningVelocity: baselineNeuralPattern.learningVelocity,
      retentionRate: 0.75, // 75% baseline retention
      skillMasteryRate: 1, // 1 skill per session baseline
      preferredSwarmSize: 1000,
      preferredTransferSpeed: 'moderate',
      sessionDuration: 60, // minutes
      totalSkillsAcquired: 0,
      totalTransferTime: 0,
      successRate: 0.8,
      recommendedNextSkills: []
    };

    this.profiles.set(userId, profile);

    this.emit('profileCreated', {
      userId,
      learningStyle,
      baselineNeuroplasticity: baselineNeuralPattern.neuroplasticity,
      timestamp: Date.now()
    });

    return profile;
  }

  /**
   * Determine learning style from neural pattern
   */
  private determineLearningStyle(
    pattern: NeuralPattern
  ): 'visual' | 'auditory' | 'kinesthetic' | 'reading-writing' {
    const { brainWaveFrequency, dominantFrequency } = pattern;

    // Analyze brain wave patterns to determine learning preference
    if (brainWaveFrequency.alpha > brainWaveFrequency.beta * 0.8) {
      return 'visual'; // Alpha dominant = visual/spatial processing
    } else if (brainWaveFrequency.theta > brainWaveFrequency.beta * 0.6) {
      return 'auditory'; // Theta involvement = language/auditory
    } else if (brainWaveFrequency.beta > 25) {
      return 'kinesthetic'; // Strong beta = motor/kinesthetic
    } else {
      return 'reading-writing'; // Balanced = analytical
    }
  }

  /**
   * Get user's learning profile
   */
  getProfile(userId: string): LearningProfile | null {
    return this.profiles.get(userId) || null;
  }

  /**
   * Update profile with new neural data
   */
  updateProfileWithNeuralData(
    userId: string,
    neuralPattern: NeuralPattern
  ): LearningProfile | null {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    // Update neuroplasticity (moving average)
    const alpha = 0.2; // Smoothing factor
    profile.averageNeuroplasticity =
      alpha * neuralPattern.neuroplasticity +
      (1 - alpha) * profile.averageNeuroplasticity;

    // Update learning velocity based on pattern
    profile.averageLearningVelocity =
      alpha * neuralPattern.learningVelocity +
      (1 - alpha) * profile.averageLearningVelocity;

    // Update learning style if significant shift detected
    const newStyle = this.determineLearningStyle(neuralPattern);
    if (newStyle !== profile.dominantLearningStyle) {
      profile.dominantLearningStyle = newStyle;
      this.emit('profileUpdated', {
        userId,
        change: 'Learning style shifted',
        newStyle,
        timestamp: Date.now()
      });
    }

    this.emit('profileUpdated', {
      userId,
      neuroplasticity: profile.averageNeuroplasticity,
      learningVelocity: profile.averageLearningVelocity
    });

    return profile;
  }

  /**
   * Apply adaptive learning settings
   */
  applyAdaptiveSettings(
    userId: string,
    performanceMetrics: {
      successRate: number; // 0-1
      speedFactor: number; // Current speed multiplier
      difficultyProgression: number; // 0-1 ease of difficulty increase
    }
  ): { swarmSize: number; transferSpeed: 'slow' | 'moderate' | 'fast' | 'maximum'; sessionDuration: number } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error(`Profile not found for user ${userId}`);
    }

    // Adjust swarm size based on success rate
    if (performanceMetrics.successRate > 0.9) {
      profile.preferredSwarmSize = Math.min(2000, profile.preferredSwarmSize + 100);
    } else if (performanceMetrics.successRate < 0.6) {
      profile.preferredSwarmSize = Math.max(500, profile.preferredSwarmSize - 100);
    }

    // Adjust transfer speed based on progression
    const speedOptions: Array<'slow' | 'moderate' | 'fast' | 'maximum'> = [
      'slow',
      'moderate',
      'fast',
      'maximum'
    ];
    const currentSpeedIndex = speedOptions.indexOf(profile.preferredTransferSpeed);

    if (performanceMetrics.difficultyProgression > 0.8) {
      // Student is ready for faster speed
      profile.preferredTransferSpeed = speedOptions[Math.min(3, currentSpeedIndex + 1)];
    } else if (performanceMetrics.difficultyProgression < 0.4) {
      // Student needs slower speed
      profile.preferredTransferSpeed = speedOptions[Math.max(0, currentSpeedIndex - 1)];
    }

    // Adjust session duration based on learning profile
    const optimalDuration = 30 + profile.averageLearningVelocity * 3;
    profile.sessionDuration = Math.round(Math.min(120, Math.max(20, optimalDuration)));

    this.emit('adaptationApplied', {
      userId,
      swarmSize: profile.preferredSwarmSize,
      transferSpeed: profile.preferredTransferSpeed,
      sessionDuration: profile.sessionDuration,
      reason: 'Performance-based adaptation'
    });

    return {
      swarmSize: profile.preferredSwarmSize,
      transferSpeed: profile.preferredTransferSpeed,
      sessionDuration: profile.sessionDuration
    };
  }

  /**
   * Record skill acquisition
   */
  recordSkillAcquisition(userId: string, skillId: string, masteryLevel: number): LearningProfile | null {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    // Update acquisition count and metrics
    profile.totalSkillsAcquired++;
    profile.successRate = (profile.successRate * (profile.totalSkillsAcquired - 1) + (masteryLevel / 100)) / profile.totalSkillsAcquired;

    // Update recommended next skills
    this.updateRecommendedSkills(profile);

    this.emit('performanceAnalyzed', {
      userId,
      skillsAcquired: profile.totalSkillsAcquired,
      averageSuccessRate: profile.successRate,
      timestamp: Date.now()
    });

    return profile;
  }

  /**
   * Update recommended skills based on profile
   */
  private updateRecommendedSkills(profile: LearningProfile): void {
    // Generate recommendations based on learning style and progression
    const styleSpecificSkills: Record<string, string[]> = {
      'visual': ['diagram-design', 'data-visualization', 'color-theory'],
      'auditory': ['public-speaking', 'music-theory', 'language-learning'],
      'kinesthetic': ['manual-skills', 'sports-science', 'engineering'],
      'reading-writing': ['technical-writing', 'research-methods', 'literature']
    };

    const basedOnStyle = styleSpecificSkills[profile.dominantLearningStyle] || [];

    // Add difficulty-appropriate recommendations
    const currentDifficulty = Math.min(5, Math.max(1, (profile.totalSkillsAcquired / 5) + 1));

    profile.recommendedNextSkills = basedOnStyle.slice(0, 3);
  }

  /**
   * Get personalized recommendations
   */
  getRecommendations(userId: string): {
    nextSkills: string[];
    focusAreas: string[];
    optimizations: string[];
  } | null {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    const focusAreas: string[] = [];

    if (profile.averageNeuroplasticity < 50) {
      focusAreas.push('Increase neuroplasticity through varied learning');
    }

    if (profile.retentionRate < 0.7) {
      focusAreas.push('Improve long-term retention with spaced repetition');
    }

    if (profile.successRate < 0.75) {
      focusAreas.push('Review fundamentals to strengthen foundation');
    }

    const optimizations: string[] = [];

    if (profile.preferredSwarmSize > 1500) {
      optimizations.push('Consider using larger swarms for complex skills');
    }

    if (profile.sessionDuration > 90) {
      optimizations.push('Take longer breaks for extended learning sessions');
    }

    this.emit('recommendationsGenerated', {
      userId,
      focusAreas,
      nextSkills: profile.recommendedNextSkills,
      optimizations
    });

    return {
      nextSkills: profile.recommendedNextSkills,
      focusAreas,
      optimizations
    };
  }

  /**
   * Estimate mastery time for skill
   */
  estimateMasteryTime(userId: string, skillDifficulty: number): number {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return Infinity;
    }

    // Base time: difficulty-based
    let baseTime = 60 * skillDifficulty; // 1 minute per difficulty level

    // Adjust for learning velocity
    baseTime /= profile.averageLearningVelocity;

    // Adjust for neuroplasticity
    const neuroplasticityFactor = profile.averageNeuroplasticity / 50; // 50 = normal
    baseTime /= neuroplasticityFactor;

    // Adjust for experience
    const experienceFactor = 1 - (profile.totalSkillsAcquired * 0.02);
    baseTime *= Math.max(0.5, experienceFactor); // Don't reduce below 50%

    return Math.round(baseTime);
  }

  /**
   * Get profile analytics
   */
  getAnalytics(userId: string): {
    totalSkillsAcquired: number;
    averageSuccessRate: number;
    totalLearningTime: number;
    skillMasteryRate: number;
    neuroplasticityTrend: string;
    learningVelocityTrend: string;
  } | null {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return null;
    }

    const neuroplasticityTrend =
      profile.averageNeuroplasticity > profile.baselineNeuralPattern.neuroplasticity
        ? 'improving'
        : 'stable';

    const learningVelocityTrend =
      profile.averageLearningVelocity > profile.baselineNeuralPattern.learningVelocity
        ? 'accelerating'
        : 'stable';

    return {
      totalSkillsAcquired: profile.totalSkillsAcquired,
      averageSuccessRate: profile.successRate,
      totalLearningTime: profile.totalTransferTime,
      skillMasteryRate: profile.skillMasteryRate,
      neuroplasticityTrend,
      learningVelocityTrend
    };
  }

  /**
   * Reset service
   */
  reset(): void {
    this.profiles.clear();
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getLearningProfileService(): LearningProfileService {
  if (!instance) {
    instance = new LearningProfileService();
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetLearningProfileService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { LearningProfileService };
