const EventEmitter = require('events');
const AntColonyOptimizer = require('../aco/AntColonyOptimizer');

/**
 * Swarm Intelligence Coordination System
 * Coordinates multiple optimization colonies and enables collective intelligence
 */
class SwarmCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.colonies = new Map();
    this.communicationChannels = new Map();
    this.sharedKnowledge = new Map();
    this.coordinationHistory = [];
    this.performanceMetrics = new Map();
    
    // Coordination parameters
    this.communicationRadius = options.communicationRadius || 0.3;
    this.knowledgeSharingRate = options.knowledgeSharingRate || 0.1;
    this.coordinationInterval = options.coordinationInterval || 30000; // 30 seconds
    this.maxColonies = options.maxColonies || 10;
    
    // Swarm behaviors
    this.behaviors = {
      cooperation: options.cooperation || true,
      competition: options.competition || false,
      specialization: options.specialization || true,
      migration: options.migration || true
    };
    
    // Start coordination
    this.startCoordination();
  }

  /**
   * Start swarm coordination
   */
  startCoordination() {
    this.coordinationTimer = setInterval(() => {
      this.coordinateSwarm();
    }, this.coordinationInterval);
  }

  /**
   * Stop swarm coordination
   */
  stopCoordination() {
    if (this.coordinationTimer) {
      clearInterval(this.coordinationTimer);
      this.coordinationTimer = null;
    }
  }

  /**
   * Add a new colony to the swarm
   */
  addColony(colonyId, colonyConfig) {
    if (this.colonies.size >= this.maxColonies) {
      throw new Error('Maximum colony limit reached');
    }

    const colony = {
      id: colonyId,
      optimizer: new AntColonyOptimizer(colonyConfig),
      type: colonyConfig.type || 'general',
      specialization: colonyConfig.specialization || null,
      performance: {
        bestFitness: 0,
        averageFitness: 0,
        convergenceRate: 0,
        efficiency: 0
      },
      knowledge: new Map(),
      neighbors: new Set(),
      lastCommunication: new Date(),
      createdAt: new Date(),
      status: 'active'
    };

    this.colonies.set(colonyId, colony);
    this.performanceMetrics.set(colonyId, {
      iterations: 0,
      improvements: 0,
      communications: 0,
      migrations: 0
    });

    // Setup communication channels
    this.setupCommunicationChannels(colonyId);
    
    // Initialize colony knowledge
    this.initializeColonyKnowledge(colonyId);

    this.emit('colonyAdded', { colonyId, colony });
    
    return colony;
  }

  /**
   * Setup communication channels between colonies
   */
  setupCommunicationChannels(colonyId) {
    const channels = {
      pheromone: new Map(),
      solutions: new Map(),
      performance: new Map(),
      alerts: new Map()
    };

    this.communicationChannels.set(colonyId, channels);
  }

  /**
   * Initialize colony knowledge
   */
  initializeColonyKnowledge(colonyId) {
    const colony = this.colonies.get(colonyId);
    if (!colony) return;

    const knowledge = {
      bestSolutions: [],
      pheromonePatterns: new Map(),
      successfulStrategies: new Map(),
      failurePatterns: new Map(),
      environmentAdaptations: new Map()
    };

    colony.knowledge = knowledge;
    this.sharedKnowledge.set(colonyId, knowledge);
  }

  /**
   * Main coordination loop
   */
  async coordinateSwarm() {
    try {
      // Update colony neighbors based on communication radius
      this.updateNeighborhoods();
      
      // Share knowledge between colonies
      if (this.behaviors.cooperation) {
        await this.shareKnowledge();
      }
      
      // Coordinate optimizations
      await this.coordinateOptimizations();
      
      // Handle colony migration if enabled
      if (this.behaviors.migration) {
        await this.handleMigration();
      }
      
      // Update performance metrics
      this.updatePerformanceMetrics();
      
      // Emit coordination event
      this.emit('swarmCoordinated', {
        timestamp: new Date(),
        activeColonies: this.colonies.size,
        totalCommunications: this.getTotalCommunications()
      });
      
    } catch (error) {
      this.emit('coordinationError', error);
    }
  }

  /**
   * Update neighborhood relationships between colonies
   */
  updateNeighborhoods() {
    for (const [colonyId, colony] of this.colonies) {
      colony.neighbors.clear();
      
      for (const [otherId, otherColony] of this.colonies) {
        if (colonyId !== otherId) {
          const distance = this.calculateColonyDistance(colony, otherColony);
          if (distance <= this.communicationRadius) {
            colony.neighbors.add(otherId);
          }
        }
      }
    }
  }

  /**
   * Calculate distance between colonies
   */
  calculateColonyDistance(colony1, colony2) {
    // Performance-based distance
    const perfDiff = Math.abs(colony1.performance.bestFitness - colony2.performance.bestFitness);
    
    // Specialization compatibility
    const specCompatibility = colony1.specialization === colony2.specialization ? 0 : 1;
    
    // Type compatibility
    const typeCompatibility = colony1.type === colony2.type ? 0 : 0.5;
    
    return (perfDiff + specCompatibility + typeCompatibility) / 3;
  }

  /**
   * Share knowledge between neighboring colonies
   */
  async shareKnowledge() {
    for (const [colonyId, colony] of this.colonies) {
      for (const neighborId of colony.neighbors) {
        await this.exchangeKnowledge(colonyId, neighborId);
      }
    }
  }

  /**
   * Exchange knowledge between two colonies
   */
  async exchangeKnowledge(colonyId1, colonyId2) {
    const colony1 = this.colonies.get(colonyId1);
    const colony2 = this.colonies.get(colonyId2);
    
    if (!colony1 || !colony2) return;

    // Share best solutions
    await this.shareBestSolutions(colony1, colony2);
    
    // Share pheromone patterns
    await this.sharePheromonePatterns(colony1, colony2);
    
    // Share successful strategies
    await this.shareStrategies(colony1, colony2);
    
    // Update communication metrics
    const metrics1 = this.performanceMetrics.get(colonyId1);
    const metrics2 = this.performanceMetrics.get(colonyId2);
    
    if (metrics1) metrics1.communications++;
    if (metrics2) metrics2.communications++;
    
    colony1.lastCommunication = new Date();
    colony2.lastCommunication = new Date();
  }

  /**
   * Share best solutions between colonies
   */
  async shareBestSolutions(colony1, colony2) {
    const knowledge1 = colony1.knowledge;
    const knowledge2 = colony2.knowledge;
    
    // Share top solutions
    const topSolutions1 = knowledge1.bestSolutions.slice(0, 3);
    const topSolutions2 = knowledge2.bestSolutions.slice(0, 3);
    
    // Exchange solutions
    for (const solution of topSolutions1) {
      if (!knowledge2.bestSolutions.find(s => s.path === solution.path)) {
        knowledge2.bestSolutions.push(solution);
        // Keep only top 10 solutions
        knowledge2.bestSolutions.sort((a, b) => b.fitness - a.fitness);
        knowledge2.bestSolutions = knowledge2.bestSolutions.slice(0, 10);
      }
    }
    
    for (const solution of topSolutions2) {
      if (!knowledge1.bestSolutions.find(s => s.path === solution.path)) {
        knowledge1.bestSolutions.push(solution);
        knowledge1.bestSolutions.sort((a, b) => b.fitness - a.fitness);
        knowledge1.bestSolutions = knowledge1.bestSolutions.slice(0, 10);
      }
    }
  }

  /**
   * Share pheromone patterns
   */
  async sharePheromonePatterns(colony1, colony2) {
    const patterns1 = colony1.knowledge.pheromonePatterns;
    const patterns2 = colony2.knowledge.pheromonePatterns;
    
    // Share effective patterns
    for (const [pattern, effectiveness] of patterns1) {
      if (effectiveness > 0.8) {
        patterns2.set(pattern, Math.max(patterns2.get(pattern) || 0, effectiveness * this.knowledgeSharingRate));
      }
    }
    
    for (const [pattern, effectiveness] of patterns2) {
      if (effectiveness > 0.8) {
        patterns1.set(pattern, Math.max(patterns1.get(pattern) || 0, effectiveness * this.knowledgeSharingRate));
      }
    }
  }

  /**
   * Share successful strategies
   */
  async shareStrategies(colony1, colony2) {
    const strategies1 = colony1.knowledge.successfulStrategies;
    const strategies2 = colony2.knowledge.successfulStrategies;
    
    // Share high-performing strategies
    for (const [strategy, performance] of strategies1) {
      if (performance > 0.7) {
        strategies2.set(strategy, Math.max(strategies2.get(strategy) || 0, performance * this.knowledgeSharingRate));
      }
    }
    
    for (const [strategy, performance] of strategies2) {
      if (performance > 0.7) {
        strategies1.set(strategy, Math.max(strategies1.get(strategy) || 0, performance * this.knowledgeSharingRate));
      }
    }
  }

  /**
   * Coordinate optimizations across colonies
   */
  async coordinateOptimizations() {
    for (const [colonyId, colony] of this.colonies) {
      if (colony.status !== 'active') continue;
      
      // Apply shared knowledge to colony
      this.applySharedKnowledge(colony);
      
      // Adjust parameters based on swarm performance
      this.adjustColonyParameters(colony);
    }
  }

  /**
   * Apply shared knowledge to colony
   */
  applySharedKnowledge(colony) {
    const knowledge = colony.knowledge;
    const optimizer = colony.optimizer;
    
    // Apply best solutions as initial conditions
    if (knowledge.bestSolutions.length > 0) {
      const bestSolution = knowledge.bestSolutions[0];
      // This would modify the optimizer's initial state
      // Implementation depends on specific optimizer interface
    }
    
    // Apply successful strategies
    for (const [strategy, performance] of knowledge.successfulStrategies) {
      if (performance > 0.8) {
        this.applyStrategy(colony, strategy);
      }
    }
  }

  /**
   * Apply a strategy to a colony
   */
  applyStrategy(colony, strategy) {
    const optimizer = colony.optimizer;
    
    switch (strategy) {
      case 'increase_exploration':
        optimizer.setParameters({ beta: optimizer.beta * 1.1 });
        break;
      case 'increase_exploitation':
        optimizer.setParameters({ alpha: optimizer.alpha * 1.1 });
        break;
      case 'faster_evaporation':
        optimizer.setParameters({ rho: Math.min(optimizer.rho * 1.1, 0.9) });
        break;
      case 'more_ants':
        optimizer.setParameters({ antCount: Math.min(optimizer.antCount + 2, 50) });
        break;
    }
  }

  /**
   * Adjust colony parameters based on performance
   */
  adjustColonyParameters(colony) {
    const performance = colony.performance;
    const optimizer = colony.optimizer;
    
    // If performance is declining, adjust parameters
    if (performance.convergenceRate < 0.01) {
      // Increase exploration
      optimizer.setParameters({ 
        beta: Math.min(optimizer.beta * 1.05, 3.0),
        alpha: optimizer.alpha * 0.95
      });
    }
    
    // If colony is performing well, specialize
    if (performance.efficiency > 0.8 && this.behaviors.specialization) {
      this.specializeColony(colony);
    }
  }

  /**
   * Specialize a colony based on its performance
   */
  specializeColony(colony) {
    const knowledge = colony.knowledge;
    
    // Determine specialization based on successful patterns
    const patternTypes = {};
    
    for (const [pattern, effectiveness] of knowledge.successfulStrategies) {
      const type = this.extractPatternType(pattern);
      patternTypes[type] = (patternTypes[type] || 0) + effectiveness;
    }
    
    // Find most successful pattern type
    let bestType = null;
    let bestScore = 0;
    
    for (const [type, score] of Object.entries(patternTypes)) {
      if (score > bestScore) {
        bestType = type;
        bestScore = score;
      }
    }
    
    if (bestType) {
      colony.specialization = bestType;
      colony.type = 'specialized';
    }
  }

  /**
   * Extract pattern type from pattern string
   */
  extractPatternType(pattern) {
    if (pattern.includes('exploration')) return 'exploration';
    if (pattern.includes('exploitation')) return 'exploitation';
    if (pattern.includes('local_search')) return 'local_search';
    if (pattern.includes('global_search')) return 'global_search';
    return 'general';
  }

  /**
   * Handle colony migration
   */
  async handleMigration() {
    for (const [colonyId, colony] of this.colonies) {
      // Check if colony should migrate
      if (this.shouldMigrate(colony)) {
        await this.migrateColony(colony);
      }
    }
  }

  /**
   * Check if a colony should migrate
   */
  shouldMigrate(colony) {
    // Migrate if performance is poor and there are better performing neighbors
    if (colony.performance.efficiency < 0.3) {
      for (const neighborId of colony.neighbors) {
        const neighbor = this.colonies.get(neighborId);
        if (neighbor && neighbor.performance.efficiency > colony.performance.efficiency + 0.2) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Migrate a colony to a better position
   */
  async migrateColony(colony) {
    // Find best neighbor
    let bestNeighbor = null;
    let bestPerformance = 0;
    
    for (const neighborId of colony.neighbors) {
      const neighbor = this.colonies.get(neighborId);
      if (neighbor && neighbor.performance.efficiency > bestPerformance) {
        bestNeighbor = neighbor;
        bestPerformance = neighbor.performance.efficiency;
      }
    }
    
    if (bestNeighbor) {
      // Adopt neighbor's successful strategies
      this.adoptStrategies(colony, bestNeighbor);
      
      // Update migration metrics
      const metrics = this.performanceMetrics.get(colony.id);
      if (metrics) metrics.migrations++;
      
      this.emit('colonyMigrated', {
        colonyId: colony.id,
        from: colony.specialization,
        to: bestNeighbor.specialization
      });
    }
  }

  /**
   * Adopt strategies from another colony
   */
  adoptStrategies(colony, sourceColony) {
    const sourceKnowledge = sourceColony.knowledge;
    const targetKnowledge = colony.knowledge;
    
    // Adopt best strategies
    for (const [strategy, performance] of sourceKnowledge.successfulStrategies) {
      if (performance > 0.7) {
        targetKnowledge.successfulStrategies.set(strategy, performance);
      }
    }
    
    // Apply immediate strategy changes
    this.applySharedKnowledge(colony);
  }

  /**
   * Update performance metrics for all colonies
   */
  updatePerformanceMetrics() {
    for (const [colonyId, colony] of this.colonies) {
      const optimizer = colony.optimizer;
      const state = optimizer.getState();
      
      if (state && state.bestSolution) {
        // Update performance
        colony.performance.bestFitness = state.bestSolution.fitness;
        
        // Calculate convergence rate
        if (state.convergenceHistory && state.convergenceHistory.length > 1) {
          const recent = state.convergenceHistory.slice(-10);
          const improvements = recent.filter((h, i) => i > 0 && h.bestFitness > recent[i-1].bestFitness);
          colony.performance.convergenceRate = improvements.length / recent.length;
        }
        
        // Calculate efficiency
        colony.performance.efficiency = this.calculateEfficiency(colony);
        
        // Update metrics
        const metrics = this.performanceMetrics.get(colonyId);
        if (metrics) {
          metrics.iterations = state.currentIteration || 0;
        }
      }
    }
  }

  /**
   * Calculate colony efficiency
   */
  calculateEfficiency(colony) {
    const performance = colony.performance;
    const metrics = this.performanceMetrics.get(colony.id);
    
    if (!metrics) return 0;
    
    // Efficiency based on convergence rate and communication benefits
    const convergenceEfficiency = performance.convergenceRate;
    const communicationEfficiency = metrics.communications > 0 ? 
      performance.bestFitness / metrics.communications : 0;
    
    return (convergenceEfficiency + communicationEfficiency) / 2;
  }

  /**
   * Get total communications across swarm
   */
  getTotalCommunications() {
    let total = 0;
    for (const metrics of this.performanceMetrics.values()) {
      total += metrics.communications;
    }
    return total;
  }

  /**
   * Get swarm analytics
   */
  getAnalytics() {
    const analytics = {
      totalColonies: this.colonies.size,
      activeColonies: 0,
      averageEfficiency: 0,
      totalCommunications: 0,
      specializationDistribution: {},
      coordinationEvents: this.coordinationHistory.length,
      swarmPerformance: {
        bestFitness: 0,
        averageConvergence: 0,
        collectiveIntelligence: 0
      }
    };

    // Calculate metrics
    let totalEfficiency = 0;
    let totalConvergence = 0;
    let bestFitness = 0;

    for (const [colonyId, colony] of this.colonies) {
      if (colony.status === 'active') {
        analytics.activeColonies++;
      }
      
      totalEfficiency += colony.performance.efficiency;
      totalConvergence += colony.performance.convergenceRate;
      bestFitness = Math.max(bestFitness, colony.performance.bestFitness);
      
      // Specialization distribution
      const spec = colony.specialization || 'general';
      analytics.specializationDistribution[spec] = 
        (analytics.specializationDistribution[spec] || 0) + 1;
      
      // Total communications
      const metrics = this.performanceMetrics.get(colonyId);
      if (metrics) {
        analytics.totalCommunications += metrics.communications;
      }
    }

    analytics.averageEfficiency = this.colonies.size > 0 ? totalEfficiency / this.colonies.size : 0;
    analytics.averageConvergence = this.colonies.size > 0 ? totalConvergence / this.colonies.size : 0;
    analytics.swarmPerformance.bestFitness = bestFitness;
    analytics.swarmPerformance.averageConvergence = analytics.averageConvergence;
    analytics.swarmPerformance.collectiveIntelligence = 
      analytics.averageEfficiency * (analytics.activeColonies / analytics.totalColonies);

    return analytics;
  }

  /**
   * Remove a colony from the swarm
   */
  removeColony(colonyId) {
    const colony = this.colonies.get(colonyId);
    if (!colony) return;

    // Clean up colony
    colony.status = 'removed';
    this.colonies.delete(colonyId);
    this.communicationChannels.delete(colonyId);
    this.sharedKnowledge.delete(colonyId);
    this.performanceMetrics.delete(colonyId);

    // Remove from neighbors
    for (const [otherId, otherColony] of this.colonies) {
      otherColony.neighbors.delete(colonyId);
    }

    this.emit('colonyRemoved', { colonyId });
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopCoordination();
    this.removeAllListeners();
    this.colonies.clear();
    this.communicationChannels.clear();
    this.sharedKnowledge.clear();
    this.performanceMetrics.clear();
    this.coordinationHistory = [];
  }
}

module.exports = SwarmCoordinator;
