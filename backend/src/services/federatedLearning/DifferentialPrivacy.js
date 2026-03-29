const crypto = require('crypto');
const logger = require('../../utils/logger');

class DifferentialPrivacy {
  constructor(options = {}) {
    this.config = {
      epsilon: options.epsilon || 1.0,
      delta: options.delta || 1e-5,
      sensitivity: options.sensitivity || 1.0,
      mechanism: options.mechanism || 'laplace',
      adaptive: options.adaptive || false,
      ...options
    };
    
    this.privacyBudget = this.config.epsilon;
    this.spentBudget = 0;
    this.queryHistory = [];
  }

  /**
   * Apply differential privacy mechanism to data
   */
  applyPrivacyMechanism(data, queryInfo = {}) {
    const epsilon = queryInfo.epsilon || this.config.epsilon;
    const sensitivity = queryInfo.sensitivity || this.config.sensitivity;
    const mechanism = queryInfo.mechanism || this.config.mechanism;

    // Check privacy budget
    if (this.spentBudget + epsilon > this.privacyBudget) {
      throw new Error('Insufficient privacy budget');
    }

    let noisyData;
    switch (mechanism) {
      case 'laplace':
        noisyData = this._laplaceMechanism(data, epsilon, sensitivity);
        break;
      case 'gaussian':
        noisyData = this._gaussianMechanism(data, epsilon, sensitivity);
        break;
      case 'exponential':
        noisyData = this._exponentialMechanism(data, queryInfo);
        break;
      default:
        throw new Error(`Unknown privacy mechanism: ${mechanism}`);
    }

    // Update privacy budget
    this.spentBudget += epsilon;
    this._recordQuery(queryInfo, epsilon);

    logger.debug(`Applied ${mechanism} mechanism with ε=${epsilon}`);
    return noisyData;
  }

  /**
   * Laplace mechanism for numeric data
   */
  _laplaceMechanism(data, epsilon, sensitivity) {
    const scale = sensitivity / epsilon;
    
    if (Array.isArray(data)) {
      return data.map(value => this._addLaplaceNoise(value, scale));
    } else if (typeof data === 'object' && data !== null) {
      const noisyData = {};
      for (const [key, value] of Object.entries(data)) {
        noisyData[key] = this._addLaplaceNoise(value, scale);
      }
      return noisyData;
    } else {
      return this._addLaplaceNoise(data, scale);
    }
  }

  /**
   * Gaussian mechanism for numeric data
   */
  _gaussianMechanism(data, epsilon, sensitivity) {
    const delta = this.config.delta;
    const sigma = sensitivity * Math.sqrt(2 * Math.log(1.25 / delta)) / epsilon;
    
    if (Array.isArray(data)) {
      return data.map(value => this._addGaussianNoise(value, sigma));
    } else if (typeof data === 'object' && data !== null) {
      const noisyData = {};
      for (const [key, value] of Object.entries(data)) {
        noisyData[key] = this._addGaussianNoise(value, sigma);
      }
      return noisyData;
    } else {
      return this._addGaussianNoise(data, sigma);
    }
  }

  /**
   * Exponential mechanism for discrete data
   */
  _exponentialMechanism(data, queryInfo) {
    const { utilityFunction, candidates } = queryInfo;
    if (!utilityFunction || !candidates) {
      throw new Error('Exponential mechanism requires utility function and candidates');
    }

    const epsilon = queryInfo.epsilon || this.config.epsilon;
    const sensitivity = queryInfo.sensitivity || 1.0;
    const scale = sensitivity / epsilon;

    // Calculate utilities and probabilities
    const utilities = candidates.map(candidate => utilityFunction(candidate, data));
    const maxUtility = Math.max(...utilities);
    
    const probabilities = utilities.map(utility => 
      Math.exp((utility - maxUtility) / scale)
    );
    
    // Normalize probabilities
    const sumProb = probabilities.reduce((sum, prob) => sum + prob, 0);
    const normalizedProbs = probabilities.map(prob => prob / sumProb);

    // Sample from distribution
    const random = Math.random();
    let cumulativeProb = 0;
    
    for (let i = 0; i < candidates.length; i++) {
      cumulativeProb += normalizedProbs[i];
      if (random <= cumulativeProb) {
        return candidates[i];
      }
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Add Laplace noise to a value
   */
  _addLaplaceNoise(value, scale) {
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return value + noise;
  }

  /**
   * Add Gaussian noise to a value
   */
  _addGaussianNoise(value, sigma) {
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    const noise = sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return value + noise;
  }

  /**
   * Apply privacy to model gradients
   */
  privatizeGradients(gradients, privacyParams = {}) {
    const epsilon = privacyParams.epsilon || this.config.epsilon;
    const sensitivity = privacyParams.sensitivity || this._calculateGradientSensitivity(gradients);
    const clipNorm = privacyParams.clipNorm || 1.0;

    // Clip gradients to bound sensitivity
    const clippedGradients = this._clipGradients(gradients, clipNorm);
    
    // Add noise
    const noisyGradients = this.applyPrivacyMechanism(clippedGradients, {
      epsilon,
      sensitivity,
      mechanism: privacyParams.mechanism || 'gaussian'
    });

    return noisyGradients;
  }

  /**
   * Clip gradients to bound L2 norm
   */
  _clipGradients(gradients, clipNorm) {
    const clipped = {};
    
    for (const [key, value] of Object.entries(gradients)) {
      if (Array.isArray(value)) {
        const norm = Math.sqrt(value.reduce((sum, val) => sum + val * val, 0));
        if (norm > clipNorm) {
          clipped[key] = value.map(val => (val * clipNorm) / norm);
        } else {
          clipped[key] = [...value];
        }
      } else {
        clipped[key] = Math.max(-clipNorm, Math.min(clipNorm, value));
      }
    }

    return clipped;
  }

  /**
   * Calculate gradient sensitivity
   */
  _calculateGradientSensitivity(gradients) {
    // Simplified sensitivity calculation
    // In practice, this depends on the specific model and training algorithm
    let totalElements = 0;
    
    for (const value of Object.values(gradients)) {
      if (Array.isArray(value)) {
        totalElements += value.length;
      } else {
        totalElements += 1;
      }
    }

    return 2.0 / totalElements; // L2 sensitivity for clipped gradients
  }

  /**
   * Apply privacy to model weights
   */
  privatizeWeights(weights, privacyParams = {}) {
    const epsilon = privacyParams.epsilon || this.config.epsilon;
    const sensitivity = privacyParams.sensitivity || this._calculateWeightSensitivity(weights);

    return this.applyPrivacyMechanism(weights, {
      epsilon,
      sensitivity,
      mechanism: privacyParams.mechanism || 'laplace'
    });
  }

  /**
   * Calculate weight sensitivity
   */
  _calculateWeightSensitivity(weights) {
    // Simplified sensitivity calculation for weights
    let totalParams = 0;
    
    for (const value of Object.values(weights)) {
      if (Array.isArray(value)) {
        totalParams += value.length;
      } else {
        totalParams += 1;
      }
    }

    return 1.0 / totalParams;
  }

  /**
   * Adaptive privacy budget allocation
   */
  adaptiveBudgetAllocation(tasks) {
    if (!this.config.adaptive) {
      return tasks.map(task => ({
        ...task,
        allocatedEpsilon: this.config.epsilon / tasks.length
      }));
    }

    // Sort tasks by importance/priority
    const sortedTasks = tasks.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Allocate budget based on exponential decay
    const allocatedTasks = [];
    let remainingBudget = this.privacyBudget - this.spentBudget;
    
    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      const remainingTasks = sortedTasks.length - i;
      
      // Exponential decay allocation
      const allocationFactor = Math.exp(-i * 0.5);
      const normalizedFactor = allocationFactor / sortedTasks.reduce((sum, _, idx) => 
        sum + Math.exp(-idx * 0.5), 0
      );
      
      const allocatedEpsilon = remainingBudget * normalizedFactor;
      
      allocatedTasks.push({
        ...task,
        allocatedEpsilon
      });
    }

    return allocatedTasks;
  }

  /**
   * Compose privacy guarantees for multiple queries
   */
  composePrivacyGuarantees(queries) {
    let totalEpsilon = 0;
    let totalDelta = 0;
    
    for (const query of queries) {
      totalEpsilon += query.epsilon || this.config.epsilon;
      totalDelta += query.delta || this.config.delta;
    }

    return {
      totalEpsilon,
      totalDelta,
      remainingBudget: Math.max(0, this.privacyBudget - totalEpsilon),
      budgetExhausted: totalEpsilon >= this.privacyBudget
    };
  }

  /**
   * Advanced privacy: RAPPOR (Randomized Aggregatable Privacy-Preserving Ordinal Response)
   */
  applyRAPPOR(data, options = {}) {
    const {
      probabilityF = options.probabilityF || 0.5,  // Probability of permanent randomization
      probabilityP = options.probabilityP || 0.75, // Probability of instantaneous randomization
      probabilityQ = options.probabilityQ || 0.25, // Probability of instantaneous randomization (for 0)
      probabilityG = options.probabilityG || 0.5   // Probability of reporting 1 in permanent randomization
    } = options;

    if (typeof data !== 'boolean' && typeof data !== 'number') {
      throw new Error('RAPPOR requires boolean or numeric data');
    }

    // Convert to boolean
    let bit = typeof data === 'boolean' ? data : data > 0;

    // Permanent randomization
    if (Math.random() < probabilityF) {
      bit = Math.random() < probabilityG;
    }

    // Instantaneous randomization
    if (bit) {
      bit = Math.random() < probabilityP;
    } else {
      bit = Math.random() < probabilityQ;
    }

    return bit;
  }

  /**
   * Local differential privacy for distributed systems
   */
  localDifferentialPrivacy(data, options = {}) {
    const epsilon = options.epsilon || this.config.epsilon;
    const mechanism = options.mechanism || 'laplace';

    // For local DP, each user adds noise before sending to server
    switch (mechanism) {
      case 'laplace':
        return this._localLaplaceMechanism(data, epsilon);
      case 'randomized_response':
        return this._randomizedResponse(data, options);
      case 'harmony':
        return this._harmonyMechanism(data, epsilon);
      default:
        throw new Error(`Unknown local DP mechanism: ${mechanism}`);
    }
  }

  /**
   * Local Laplace mechanism
   */
  _localLaplaceMechanism(data, epsilon) {
    const sensitivity = 1.0; // Local sensitivity is typically 1
    const scale = sensitivity / epsilon;
    return this._addLaplaceNoise(data, scale);
  }

  /**
   * Randomized response mechanism
   */
  _randomizedResponse(data, options = {}) {
    const probability = options.probability || 0.5;
    
    if (typeof data === 'boolean') {
      // With probability p, report true value; with probability 1-p, report random
      if (Math.random() < probability) {
        return data;
      } else {
        return Math.random() < 0.5;
      }
    } else {
      // For categorical data
      const categories = options.categories || [data];
      if (Math.random() < probability) {
        return data;
      } else {
        return categories[Math.floor(Math.random() * categories.length)];
      }
    }
  }

  /**
   * Harmony mechanism for high-dimensional data
   */
  _harmonyMechanism(data, epsilon) {
    // Simplified Harmony mechanism implementation
    const dimension = Array.isArray(data) ? data.length : 1;
    const scale = Math.sqrt(2 * Math.log(dimension)) / epsilon;
    
    if (Array.isArray(data)) {
      return data.map(value => this._addGaussianNoise(value, scale));
    } else {
      return this._addGaussianNoise(data, scale);
    }
  }

  /**
   * Record query for audit trail
   */
  _recordQuery(queryInfo, epsilon) {
    this.queryHistory.push({
      timestamp: new Date().toISOString(),
      epsilon,
      mechanism: queryInfo.mechanism || this.config.mechanism,
      queryType: queryInfo.type || 'unknown',
      sensitivity: queryInfo.sensitivity || this.config.sensitivity
    });

    // Keep only last 1000 queries
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }
  }

  /**
   * Get privacy budget status
   */
  getBudgetStatus() {
    return {
      totalBudget: this.privacyBudget,
      spentBudget: this.spentBudget,
      remainingBudget: Math.max(0, this.privacyBudget - this.spentBudget),
      budgetUtilization: (this.spentBudget / this.privacyBudget) * 100,
      queryCount: this.queryHistory.length
    };
  }

  /**
   * Reset privacy budget
   */
  resetBudget(newBudget = null) {
    this.privacyBudget = newBudget || this.config.epsilon;
    this.spentBudget = 0;
    this.queryHistory = [];
    
    logger.info(`Privacy budget reset to ${this.privacyBudget}`);
  }

  /**
   * Get privacy audit report
   */
  getPrivacyReport() {
    const mechanismCounts = {};
    let totalEpsilon = 0;

    for (const query of this.queryHistory) {
      mechanismCounts[query.mechanism] = (mechanismCounts[query.mechanism] || 0) + 1;
      totalEpsilon += query.epsilon;
    }

    return {
      summary: this.getBudgetStatus(),
      mechanismUsage: mechanismCounts,
      averageEpsilonPerQuery: totalEpsilon / this.queryHistory.length || 0,
      recentQueries: this.queryHistory.slice(-10),
      complianceStatus: totalEpsilon <= this.privacyBudget ? 'compliant' : 'exceeded'
    };
  }
}

module.exports = DifferentialPrivacy;
