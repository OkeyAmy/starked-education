/**
 * Safety Monitor Service
 * Monitors biological safety, health metrics, containment status, and emergency protocols
 */

import type { SafetyStatus, NanobotSwarm } from '../types/nanotech';

/**
 * Singleton instance
 */
let instance: SafetyMonitorService | null = null;

/**
 * Safety Threshold Configuration
 */
const SAFETY_THRESHOLDS = {
  maxNeurotoxicity: 40,
  maxInflammation: 35,
  maxImmuneResponse: 60,
  minContainment: 95,
  maxEscapeRate: 2,
  maxErrorRate: 0.05
};

/**
 * Safety Monitor Service
 */
class SafetyMonitorService {
  private activeMonitoring: Map<string, SafetyStatus> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private emergencyShutdowns: Set<string> = new Set();

  constructor() {
    this.registerListeners();
    this.startHealthChecks();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'healthCheckComplete',
      'warningIssued',
      'criticalAlert',
      'emergencyShutdown',
      'recoveryInitiated',
      'allClear'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to monitor events
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
   * Start monitoring swarm health
   */
  async startMonitoring(swarmId: string, swarm: NanobotSwarm): Promise<SafetyStatus> {
    const status: SafetyStatus = {
      swarmId,
      timestamp: Date.now(),
      neurotoxicity: 5 + Math.random() * 10,          // Start low
      inflammationLevel: 3 + Math.random() * 8,
      immuneResponse: 20 + Math.random() * 15,
      nanobotContainment: 99 + Math.random() * 0.9,   // Nearly perfect
      escapeDetections: 0,
      recoverySuccessRate: 100,
      systemIntegrity: 98 + Math.random(),
      errorRate: 0.001 + Math.random() * 0.005,
      overallSafetyScore: 95,
      status: 'safe',
      recommendations: ['Continue monitoring', 'All parameters normal']
    };

    this.activeMonitoring.set(swarmId, status);
    return status;
  }

  /**
   * Get safety status
   */
  getSafetyStatus(swarmId: string): SafetyStatus | null {
    return this.activeMonitoring.get(swarmId) || null;
  }

  /**
   * Start background health checks
   */
  private startHealthChecks(): void {
    this.checkInterval = setInterval(() => {
      this.performHealthChecks();
    }, 2000); // Check every 2 seconds
  }

  /**
   * Perform health checks on all monitored swarms
   */
  private performHealthChecks(): void {
    this.activeMonitoring.forEach((status, swarmId) => {
      this.updateHealthMetrics(status);
      this.checkSafetyThresholds(status, swarmId);
    });
  }

  /**
   * Update health metrics over time
   */
  private updateHealthMetrics(status: SafetyStatus): void {
    // Simulate gradual metric changes
    const timeElapsed = Date.now() - status.timestamp;
    const timeMinutes = timeElapsed / 60000;

    // Neurotoxicity increases slowly with operation
    status.neurotoxicity = Math.min(
      100,
      status.neurotoxicity + timeMinutes * 0.5 + (Math.random() - 0.5) * 2
    );

    // Inflammation increases with stress
    status.inflammationLevel = Math.min(
      100,
      status.inflammationLevel + timeMinutes * 0.3 + (Math.random() - 0.5) * 1.5
    );

    // Immune response varies
    status.immuneResponse = Math.max(
      0,
      Math.min(100, status.immuneResponse + (Math.random() - 0.5) * 3)
    );

    // Containment slowly decreases if not maintained
    status.nanobotContainment = Math.max(
      90,
      status.nanobotContainment - timeMinutes * 0.05
    );

    // System integrity slightly decreases
    status.systemIntegrity = Math.max(
      80,
      status.systemIntegrity - timeMinutes * 0.1
    );

    // Error rate increases with time (entropy)
    status.errorRate = Math.min(
      0.1,
      status.errorRate + timeMinutes * 0.001
    );

    // Recalculate safety score
    this.calculateSafetyScore(status);
  }

  /**
   * Calculate overall safety score
   */
  private calculateSafetyScore(status: SafetyStatus): void {
    // Weighted score calculation
    const neurotoxScore = Math.max(0, 100 - status.neurotoxicity * 1.5);
    const inflammationScore = Math.max(0, 100 - status.inflammationLevel * 1.5);
    const immuneScore = Math.max(0, 100 - Math.abs(status.immuneResponse - 40) * 1.5);
    const containmentScore = status.nanobotContainment;
    const integrityScore = status.systemIntegrity;
    const errorScore = Math.max(0, 100 - status.errorRate * 10000);

    const weights = {
      neurotox: 0.2,
      inflammation: 0.2,
      immune: 0.15,
      containment: 0.2,
      integrity: 0.15,
      error: 0.1
    };

    status.overallSafetyScore = (
      neurotoxScore * weights.neurotox +
      inflammationScore * weights.inflammation +
      immuneScore * weights.immune +
      containmentScore * weights.containment +
      integrityScore * weights.integrity +
      errorScore * weights.error
    );
  }

  /**
   * Check safety thresholds and update status
   */
  private checkSafetyThresholds(status: SafetyStatus, swarmId: string): void {
    const previousStatus = status.status;
    const recommendations: string[] = [];

    // Check each threshold
    if (status.neurotoxicity > SAFETY_THRESHOLDS.maxNeurotoxicity) {
      recommendations.push(`⚠️ Neurotoxicity high (${status.neurotoxicity.toFixed(1)})`);
    }

    if (status.inflammationLevel > SAFETY_THRESHOLDS.maxInflammation) {
      recommendations.push(`⚠️ Inflammation elevated (${status.inflammationLevel.toFixed(1)})`);
    }

    if (Math.abs(status.immuneResponse - 40) > 30) {
      recommendations.push(`⚠️ Immune response abnormal (${status.immuneResponse.toFixed(1)})`);
    }

    if (status.nanobotContainment < SAFETY_THRESHOLDS.minContainment) {
      recommendations.push('🚨 Containment compromised!');
    }

    if (status.errorRate > SAFETY_THRESHOLDS.maxErrorRate) {
      recommendations.push('🚨 Error rate critically high');
    }

    // Determine status
    let newStatus: SafetyStatus['status'] = 'safe';

    if (
      status.neurotoxicity > SAFETY_THRESHOLDS.maxNeurotoxicity * 1.2 ||
      status.inflammationLevel > SAFETY_THRESHOLDS.maxInflammation * 1.2 ||
      status.nanobotContainment < 90 ||
      status.errorRate > 0.08
    ) {
      newStatus = 'critical';
      this.emit('criticalAlert', {
        swarmId,
        status,
        trigger: recommendations[0]
      });
    } else if (
      status.neurotoxicity > SAFETY_THRESHOLDS.maxNeurotoxicity ||
      status.inflammationLevel > SAFETY_THRESHOLDS.maxInflammation ||
      status.oversallSafetyScore < 70
    ) {
      newStatus = 'caution';
      this.emit('warningIssued', {
        swarmId,
        status,
        warnings: recommendations
      });
    } else {
      if (previousStatus !== 'safe') {
        this.emit('allClear', {
          swarmId,
          safetyScore: status.overallSafetyScore
        });
      }
    }

    status.status = newStatus;
    status.recommendations = recommendations.length > 0
      ? recommendations
      : ['All parameters normal', 'Continue monitoring'];

    this.emit('healthCheckComplete', {
      swarmId,
      status,
      statusChanged: previousStatus !== newStatus
    });
  }

  /**
   * Emergency containment activation
   */
  async activateEmergencyContainment(swarmId: string): Promise<void> {
    const status = this.activeMonitoring.get(swarmId);
    if (!status) {
      throw new Error(`Safety status not found for swarm ${swarmId}`);
    }

    // Increase containment (mimic physical containment field)
    status.nanobotContainment = Math.min(100, status.nanobotContainment + 5);
    status.recommendations.push('🔒 Emergency containment activated');

    this.emit('emergencyShutdown', {
      swarmId,
      action: 'containment_increased',
      containmentLevel: status.nanobotContainment
    });
  }

  /**
   * Emergency shutdown of swarm
   */
  async emergencyShutdown(swarmId: string): Promise<void> {
    const status = this.activeMonitoring.get(swarmId);
    if (!status) {
      throw new Error(`Safety status not found for swarm ${swarmId}`);
    }

    this.emergencyShutdowns.add(swarmId);

    status.status = 'critical';
    status.recommendations = [
      '🔴 EMERGENCY SHUTDOWN INITIATED',
      'Nanobots being recalled immediately',
      'Recovery protocols activated'
    ];

    this.emit('emergencyShutdown', {
      swarmId,
      action: 'emergency_shutdown',
      timestamp: Date.now()
    });

    // Simulate shutdown sequence
    setTimeout(() => {
      if (status) {
        status.status = 'safe';
        status.recommendations = [
          'Shutdown sequence complete',
          'All nanobots contained',
          'Ready for next operation'
        ];

        this.emit('recoveryInitiated', {
          swarmId,
          recoveryComplete: true
        });
      }
    }, 3000);
  }

  /**
   * Biological decontamination protocol
   */
  async decontaminate(swarmId: string): Promise<void> {
    const status = this.activeMonitoring.get(swarmId);
    if (!status) {
      throw new Error(`Safety status not found for swarm ${swarmId}`);
    }

    // Reduce biomarkers
    status.neurotoxicity = Math.max(0, status.neurotoxicity - 15);
    status.inflammationLevel = Math.max(0, status.inflammationLevel - 12);
    status.immuneResponse = Math.max(20, Math.min(60, status.immuneResponse));

    status.recommendations.push('🌊 Decontamination sequence executed');

    this.emit('recoveryInitiated', {
      swarmId,
      action: 'decontamination',
      neurotoxicity: status.neurotoxicity,
      inflammation: status.inflammationLevel
    });
  }

  /**
   * Get comprehensive safety report
   */
  getSafetyReport(swarmId: string): {
    overallSafety: number;
    biomarkers: Record<string, number>;
    threats: string[];
    recommendations: string[];
    requiresAction: boolean;
  } | null {
    const status = this.activeMonitoring.get(swarmId);
    if (!status) {
      return null;
    }

    const threats: string[] = [];

    if (status.neurotoxicity > SAFETY_THRESHOLDS.maxNeurotoxicity) {
      threats.push('High neurotoxicity');
    }
    if (status.inflammationLevel > SAFETY_THRESHOLDS.maxInflammation) {
      threats.push('Elevated inflammation');
    }
    if (status.nanobotContainment < SAFETY_THRESHOLDS.minContainment) {
      threats.push('Containment breach risk');
    }

    return {
      overallSafety: status.overallSafetyScore,
      biomarkers: {
        neurotoxicity: status.neurotoxicity,
        inflammation: status.inflammationLevel,
        immuneResponse: status.immuneResponse,
        containment: status.nanobotContainment,
        systemIntegrity: status.systemIntegrity,
        errorRate: status.errorRate
      },
      threats,
      recommendations: status.recommendations,
      requiresAction: status.status !== 'safe'
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(swarmId: string): void {
    this.activeMonitoring.delete(swarmId);
    this.emergencyShutdowns.delete(swarmId);
  }

  /**
   * Reset service
   */
  reset(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.activeMonitoring.clear();
    this.emergencyShutdowns.clear();
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getSafetyMonitorService(): SafetyMonitorService {
  if (!instance) {
    instance = new SafetyMonitorService();
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetSafetyMonitorService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { SafetyMonitorService };
