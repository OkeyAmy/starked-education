/**
 * Nanobot Controller Service
 * Manages swarms of nanobots using particle swarm optimization
 * Handles deployment, coordination, mission planning, and nanobot lifecycle
 */

import type { Nanobot, NanobotSwarm } from '../types/nanotech';

/**
 * Singleton instance
 */
let instance: NanobotControllerService | null = null;

/**
 * Nanobot Controller Service
 */
class NanobotControllerService {
  private swarms: Map<string, NanobotSwarm> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.registerListeners();
    this.startSwarmUpdates();
  }

  /**
   * Register event listeners
   */
  private registerListeners(): void {
    const events = [
      'swarmDeployed',
      'swarmStatusUpdate',
      'nanobotStatusChange',
      'missionProgress',
      'swarmReturned',
      'nanobotError'
    ];

    events.forEach(event => {
      this.listeners.set(event, new Set());
    });
  }

  /**
   * Subscribe to controller events
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
   * Deploy nanobot swarm for skill transfer
   */
  async deploySwarm(
    userId: string,
    skillId: string,
    swarmSize: number = 1000,
    transferSpeed: 'slow' | 'moderate' | 'fast' | 'maximum' = 'moderate'
  ): Promise<NanobotSwarm> {
    const swarmId = `swarm_${skillId}_${Date.now()}`;
    const speedMultipliers: Record<typeof transferSpeed, number> = {
      'slow': 25,
      'moderate': 50,
      'fast': 100,
      'maximum': 200
    };

    // Create nanobots
    const nanobots: Nanobot[] = [];
    for (let i = 0; i < swarmSize; i++) {
      nanobots.push({
        id: `nanobot_${swarmId}_${i}`,
        swarmId,
        status: 'idle',
        healthLevel: 100,
        energyLevel: 100,
        currentMission: 'deploying',
        targetNeuron: Math.floor(Math.random() * 1000),
        knowledgeFragments: [],
        transferProgress: 0,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        tasksCompleted: 0,
        errorCount: 0
      });
    }

    // Create swarm
    const swarm: NanobotSwarm = {
      id: swarmId,
      userId,
      skillTargetId: skillId,
      nanobots,
      totalCount: swarmSize,
      activeCount: swarmSize,
      coordinationStrategy: 'particle-swarm',
      cohesion: 0.8,
      efficiency: 0.6,
      missionProgress: 0,
      estimatedCompletion: 30000, // 30 seconds at normal speed
      knowledgeTransferred: 0,
      deployedAt: Date.now(),
      estimatedReturnAt: Date.now() + 30000,
      safetyStatus: 'safe'
    };

    // Adjust timing by speed multiplier
    swarm.estimatedCompletion = Math.round(swarm.estimatedCompletion / speedMultipliers[transferSpeed]);
    swarm.estimatedReturnAt = Date.now() + swarm.estimatedCompletion;

    this.swarms.set(swarmId, swarm);

    // Emit deployment event
    this.emit('swarmDeployed', {
      swarmId,
      swarmSize,
      estimatedCompletion: swarm.estimatedCompletion
    });

    return swarm;
  }

  /**
   * Get swarm status
   */
  getSwarmStatus(swarmId: string): NanobotSwarm | null {
    return this.swarms.get(swarmId) || null;
  }

  /**
   * List all active swarms
   */
  listActiveSwarms(): NanobotSwarm[] {
    return Array.from(this.swarms.values()).filter(
      swarm => swarm.missionProgress < 100
    );
  }

  /**
   * Update nanobot mission
   */
  private updateNanobotMission(nanobot: Nanobot, swarm: NanobotSwarm): void {
    if (swarm.missionProgress >= 100) {
      nanobot.status = 'idle';
      nanobot.currentMission = 'returning';
      nanobot.transferProgress = 100;
      return;
    }

    // Update nanobot status and progress
    const randomFactor = Math.random();

    if (randomFactor < 0.85) {
      // Healthy operation
      nanobot.status = 'transferring';
      nanobot.transferProgress = Math.min(100, nanobot.transferProgress + Math.random() * 15);
      nanobot.energyLevel = Math.max(10, nanobot.energyLevel - Math.random() * 5);
      nanobot.lastActivityAt = Date.now();
    } else if (randomFactor < 0.95) {
      // Resting period
      nanobot.status = 'resting';
      nanobot.energyLevel = Math.min(100, nanobot.energyLevel + Math.random() * 10);
    } else {
      // Minor error
      nanobot.status = 'errored';
      nanobot.errorCount++;
      setTimeout(() => {
        nanobot.status = 'idle';
      }, 1000);

      this.emit('nanobotError', {
        nanobotId: nanobot.id,
        swarmId: swarm.id,
        errorCount: nanobot.errorCount
      });
    }
  }

  /**
   * Start background swarm updates
   */
  private startSwarmUpdates(): void {
    this.updateInterval = setInterval(() => {
      this.updateAllSwarms();
    }, 1000); // Update every second
  }

  /**
   * Update all active swarms
   */
  private updateAllSwarms(): void {
    this.swarms.forEach((swarm, swarmId) => {
      // Skip completed missions
      if (swarm.missionProgress >= 100) {
        return;
      }

      // Update individual nanobots
      let activeCount = 0;
      let totalProgress = 0;

      swarm.nanobots.forEach(nanobot => {
        this.updateNanobotMission(nanobot, swarm);

        if (nanobot.status === 'transferring') {
          activeCount++;
        }

        totalProgress += nanobot.transferProgress;
      });

      // Update swarm metrics
      activeCount = Math.max(0, activeCount - Math.floor(Math.random() * 50)); // Some becoming idle
      swarm.activeCount = activeCount;
      swarm.missionProgress = Math.min(100, totalProgress / swarm.totalCount);
      swarm.knowledgeTransferred = swarm.missionProgress;
      swarm.cohesion = Math.max(0.5, swarm.cohesion - 0.02 + Math.random() * 0.05);
      swarm.efficiency = Math.max(0.4, swarm.efficiency + Math.random() * 0.05);

      // Update safety status
      if (swarm.missionProgress > 90) {
        swarm.safetyStatus = 'safe';
      }

      // Check if swarm should be marked as returned
      if (swarm.missionProgress >= 100) {
        this.emit('swarmReturned', {
          swarmId,
          totalTransferred: swarm.knowledgeTransferred,
          completionTime: Date.now() - swarm.deployedAt
        });
      } else {
        this.emit('missionProgress', {
          swarmId,
          progress: swarm.missionProgress,
          activeNanobots: swarm.activeCount,
          knowledgeTransferred: swarm.knowledgeTransferred
        });
      }

      this.emit('swarmStatusUpdate', swarm);
    });
  }

  /**
   * Optimize swarm using particle swarm algorithm
   */
  optimizeSwarmFormation(swarmId: string): {
    cohesion: number;
    efficiency: number;
    recommendation: string;
  } {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    const activeFraction = swarm.activeCount / swarm.totalCount;
    
    // Adjust cohesion based on performance
    let newCohesion = swarm.cohesion;
    let recommendation = 'maintain formation';

    if (activeFraction > 0.7) {
      // Increase cohesion - performing well
      newCohesion = Math.min(1, swarm.cohesion + 0.1);
      recommendation = 'tighten formation for efficiency';
    } else if (activeFraction < 0.4) {
      // Decrease cohesion - spread out for redundancy
      newCohesion = Math.max(0.5, swarm.cohesion - 0.1);
      recommendation = 'spread formation for fault tolerance';
    }

    swarm.cohesion = newCohesion;
    swarm.efficiency = Math.min(1, swarm.efficiency + (newCohesion - 0.75) * 0.3);

    return {
      cohesion: newCohesion,
      efficiency: swarm.efficiency,
      recommendation
    };
  }

  /**
   * Pause swarm operations
   */
  async pauseSwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    swarm.nanobots.forEach(nanobot => {
      nanobot.status = 'idle';
    });
  }

  /**
   * Resume swarm operations
   */
  async resumeSwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    swarm.nanobots.forEach(nanobot => {
      if (nanobot.transferProgress < 100) {
        nanobot.status = 'active';
      }
    });
  }

  /**
   * Emergency swarm shutdown
   */
  async shutdownSwarm(swarmId: string): Promise<void> {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      throw new Error(`Swarm ${swarmId} not found`);
    }

    swarm.missionProgress = 0;
    swarm.nanobots.forEach(nanobot => {
      nanobot.status = 'idle';
      nanobot.transferProgress = 0;
    });
  }

  /**
   * Get swarm statistics
   */
  getSwarmStats(swarmId: string): {
    totalNanobots: number;
    activeNanobots: number;
    averageHealth: number;
    averageEnergy: number;
    totalTasksCompleted: number;
    totalErrors: number;
  } | null {
    const swarm = this.swarms.get(swarmId);
    if (!swarm) {
      return null;
    }

    const totalHealth = swarm.nanobots.reduce((sum, nb) => sum + nb.healthLevel, 0);
    const totalEnergy = swarm.nanobots.reduce((sum, nb) => sum + nb.energyLevel, 0);
    const totalTasks = swarm.nanobots.reduce((sum, nb) => sum + nb.tasksCompleted, 0);
    const totalErrors = swarm.nanobots.reduce((sum, nb) => sum + nb.errorCount, 0);

    return {
      totalNanobots: swarm.totalCount,
      activeNanobots: swarm.activeCount,
      averageHealth: totalHealth / swarm.totalCount,
      averageEnergy: totalEnergy / swarm.totalCount,
      totalTasksCompleted: totalTasks,
      totalErrors
    };
  }

  /**
   * Reset service
   */
  reset(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.swarms.clear();
    this.listeners.forEach(callbacks => callbacks.clear());
  }
}

/**
 * Get or create singleton instance
 */
export function getNanobotControllerService(): NanobotControllerService {
  if (!instance) {
    instance = new NanobotControllerService();
  }

  return instance;
}

/**
 * Reset singleton (for testing)
 */
export function resetNanobotControllerService(): void {
  if (instance) {
    instance.reset();
    instance = null;
  }
}

export type { NanobotControllerService };
