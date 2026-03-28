/**
 * Neural Interface Service
 * Simulates and manages brain-computer interface for nanotechnology learning
 * Monitors neural activity, maps neural pathways, and detects learning patterns
 */

import type { NeuralPattern } from '../types/nanotech';
import {
  generateNeuralPattern,
  evolveNeuralPattern,
  calculatePatternSimilarity,
  detectLearningState
} from '../utils/neuralSimulation';

/**
 * Singleton instance
 */
let instance: NeuralInterfaceService | null = null;

/**
 * Neural Interface Service
 */
class NeuralInterfaceService {
  private userId: string;
  private currentPattern: NeuralPattern | null = null;
  private patternHistory: NeuralPattern[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
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
      'neuralPatternUpdate',
      'learningStateChange',
      'neuroplasticityGain',
      'pathMapped',
      'anomalyDetected'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to neural interface events
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    const callbacks = this.listeners.get(event)!;
    callbacks.add(callback);

    // Return unsubscribe function
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
   * Start monitoring neural activity
   */
  async startMonitoring(context: string = 'general'): Promise<void> {
    if (this.isMonitoring) {
      console.warn('Monitoring already active');
      return;
    }

    this.isMonitoring = true;

    // Generate initial pattern
    this.currentPattern = generateNeuralPattern(this.userId, 50, context);
    this.patternHistory = [this.currentPattern];
    this.emit('neuralPatternUpdate', this.currentPattern);

    // Monitor at regular intervals (every 500ms)
    this.monitoringInterval = setInterval(() => {
      this.updateNeuralPattern(context);
    }, 500);
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      console.warn('Monitoring not active');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Update neural pattern (during monitoring)
   */
  private updateNeuralPattern(context: string): void {
    if (!this.currentPattern) return;

    // Simulate natural neural pattern evolution
    const randomFocusShift = (Math.random() - 0.5) * 10;
    const newFocus = Math.max(0, Math.min(100, this.currentPattern.focusLevel + randomFocusShift));

    // Generate new pattern with slight variation
    const newPattern = generateNeuralPattern(this.userId, newFocus, context);

    const previousPattern = this.currentPattern;
    this.currentPattern = newPattern;
    this.patternHistory.push(newPattern);

    // Keep history size manageable
    if (this.patternHistory.length > 1000) {
      this.patternHistory = this.patternHistory.slice(-500);
    }

    // Emit update
    this.emit('neuralPatternUpdate', newPattern);

    // Check for learning state change
    const previousState = detectLearningState(previousPattern);
    const currentState = detectLearningState(newPattern);

    if (previousState !== currentState) {
      this.emit('learningStateChange', {
        previousState,
        currentState,
        pattern: newPattern
      });
    }

    // Check for neuroplasticity gain
    if (newPattern.neuroplasticity > previousPattern.neuroplasticity) {
      this.emit('neuroplasticityGain', {
        gain: newPattern.neuroplasticity - previousPattern.neuroplasticity,
        totalNeuroplasticity: newPattern.neuroplasticity
      });
    }

    // Detect anomalies
    this.detectAnomalies(newPattern, previousPattern);
  }

  /**
   * Detect neural anomalies
   */
  private detectAnomalies(current: NeuralPattern, previous: NeuralPattern): void {
    const anomalies: string[] = [];

    // Check for sudden focus drops
    if (current.focusLevel < previous.focusLevel - 30) {
      anomalies.push('Sudden focus drop detected');
    }

    // Check for unusual brain wave patterns
    const waveSpread = Math.max(
      Math.abs(current.brainWaveFrequency.delta - previous.brainWaveFrequency.delta),
      Math.abs(current.brainWaveFrequency.theta - previous.brainWaveFrequency.theta),
      Math.abs(current.brainWaveFrequency.alpha - previous.brainWaveFrequency.alpha)
    );

    if (waveSpread > 20) {
      anomalies.push('Unusual brain wave fluctuation');
    }

    // Check for low neuroplasticity with high focus
    if (current.focusLevel > 80 && current.neuroplasticity < 40) {
      anomalies.push('Low neuroplasticity despite high focus');
    }

    if (anomalies.length > 0) {
      this.emit('anomalyDetected', {
        anomalies,
        pattern: current,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get current neural pattern
   */
  getCurrentPattern(): NeuralPattern | null {
    return this.currentPattern;
  }

  /**
   * Get neural pattern history
   */
  getPatternHistory(limit: number = 100): NeuralPattern[] {
    return this.patternHistory.slice(-limit);
  }

  /**
   * Get current neural state (partial pattern)
   */
  getNeuralState(): Partial<NeuralPattern> {
    if (!this.currentPattern) {
      return {};
    }

    return {
      focusLevel: this.currentPattern.focusLevel,
      neuroplasticity: this.currentPattern.neuroplasticity,
      learningVelocity: this.currentPattern.learningVelocity,
      brainWaveFrequency: this.currentPattern.brainWaveFrequency,
      dominantFrequency: this.currentPattern.dominantFrequency
    };
  }

  /**
   * Map neural pathway (simulate brain area activation)
   */
  mapNeuralPathway(skillCategory: string): {
    pathId: string;
    activationMap: number[];
    primaryNodes: number[];
    connectionStrength: number;
  } {
    if (!this.currentPattern) {
      throw new Error('Neural monitoring not active');
    }

    // Determine pathway based on skill category
    const categoryMappings: Record<string, { center: number; spread: number }> = {
      'visual': { center: 200, spread: 100 },
      'auditory': { center: 400, spread: 100 },
      'motor': { center: 600, spread: 100 },
      'memory': { center: 300, spread: 150 },
      'problem-solving': { center: 350, spread: 180 }
    };

    const mapping = categoryMappings[skillCategory] || categoryMappings['memory'];

    // Create activation map based on current pattern
    const activationMap = this.currentPattern.neuronActivation.map((activation, index) => {
      const distance = Math.abs(index - mapping.center);
      const relativeActivation = Math.max(0, 1 - (distance / (mapping.spread * 2)));

      return activation * (0.5 + 0.5 * relativeActivation);
    });

    // Find primary nodes (highest activation)
    const primaryNodes: number[] = [];
    const threshold = 0.7;

    activationMap.forEach((activation, index) => {
      if (activation > threshold) {
        primaryNodes.push(index);
      }
    });

    // Limit to top 20 nodes
    primaryNodes.sort((a, b) => activationMap[b] - activationMap[a]);
    primaryNodes.splice(20);

    // Calculate average connection strength
    const connectionStrength =
      primaryNodes.reduce((sum, idx) => sum + activationMap[idx], 0) / Math.max(1, primaryNodes.length);

    this.emit('pathMapped', {
      skillCategory,
      pathId: `path_${skillCategory}_${Date.now()}`,
      primaryNodeCount: primaryNodes.length,
      connectionStrength
    });

    return {
      pathId: `path_${skillCategory}_${Date.now()}`,
      activationMap,
      primaryNodes,
      connectionStrength
    };
  }

  /**
   * Simulate neural adaptation to learning
   */
  async simulateAdaptation(
    learningTime: number,
    skillDifficulty: number,
    successRate: number
  ): Promise<NeuralPattern | null> {
    if (!this.currentPattern) {
      return null;
    }

    const evolvedPattern = evolveNeuralPattern(
      this.currentPattern,
      learningTime,
      skillDifficulty,
      successRate
    );

    this.currentPattern = evolvedPattern;
    this.patternHistory.push(evolvedPattern);

    this.emit('neuralPatternUpdate', evolvedPattern);

    return evolvedPattern;
  }

  /**
   * Get neural similarity to baseline
   */
  getSimilarityToBaseline(): number {
    if (!this.currentPattern || this.patternHistory.length < 2) {
      return 1;
    }

    const baseline = this.patternHistory[0];
    return calculatePatternSimilarity(this.currentPattern, baseline);
  }

  /**
   * Get learning readiness score
   */
  getLearningReadiness(): number {
    if (!this.currentPattern) {
      return 0;
    }

    return this.currentPattern.learningReadiness;
  }

  /**
   * Reset service
   */
  reset(): void {
    this.stopMonitoring();
    this.currentPattern = null;
    this.patternHistory = [];
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getNeuralInterfaceService(userId: string): NeuralInterfaceService {
  if (!instance) {
    instance = new NeuralInterfaceService(userId);
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetNeuralInterfaceService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { NeuralInterfaceService };
