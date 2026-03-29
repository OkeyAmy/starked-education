const EventEmitter = require('events');
const logger = require('../../utils/logger');

class CollectiveIntelligence extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      aggregationMethod: options.aggregationMethod || 'weighted_average',
      consensusThreshold: options.consensusThreshold || 0.67,
      diversityBonus: options.diversityBonus || 0.1,
      learningRate: options.learningRate || 0.01,
      memoryDecay: options.memoryDecay || 0.95,
      ...options
    };

    this.collectiveKnowledge = new Map();
    this.agentContributions = new Map();
    this.consensusHistory = [];
    this.intelligenceMetrics = {
      collectiveAccuracy: 0,
      diversityIndex: 0,
      convergenceRate: 0,
      adaptationSpeed: 0
    };
  }

  async initialize() {
    logger.info('Collective intelligence system initialized');
  }

  aggregateAgentKnowledge(agentKnowledge, taskId) {
    const aggregation = this._performAggregation(agentKnowledge, taskId);
    
    this.collectiveKnowledge.set(taskId, aggregation);
    this._updateAgentContributions(agentKnowledge, taskId);
    
    this.emit('knowledgeAggregated', { taskId, aggregation });
    
    return aggregation;
  }

  _performAggregation(agentKnowledge, taskId) {
    switch (this.config.aggregationMethod) {
      case 'weighted_average':
        return this._weightedAverageAggregation(agentKnowledge);
      case 'consensus_based':
        return this._consensusBasedAggregation(agentKnowledge);
      case 'diversity_enhanced':
        return this._diversityEnhancedAggregation(agentKnowledge);
      default:
        return this._weightedAverageAggregation(agentKnowledge);
    }
  }

  _weightedAverageAggregation(agentKnowledge) {
    const weights = agentKnowledge.map(k => this._calculateAgentWeight(k));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    if (totalWeight === 0) return null;
    
    const aggregated = {
      weights: new Array(10).fill(0),
      confidence: 0,
      accuracy: 0,
      contributors: agentKnowledge.length,
      method: 'weighted_average'
    };
    
    agentKnowledge.forEach((knowledge, index) => {
      const weight = weights[index] / totalWeight;
      
      if (knowledge.weights) {
        knowledge.weights.forEach((w, i) => {
          aggregated.weights[i] += w * weight;
        });
      }
      
      aggregated.confidence += (knowledge.confidence || 0) * weight;
      aggregated.accuracy += (knowledge.accuracy || 0) * weight;
    });
    
    return aggregated;
  }

  _consensusBasedAggregation(agentKnowledge) {
    const consensus = this._buildConsensus(agentKnowledge);
    
    if (consensus.agreement < this.config.consensusThreshold) {
      return this._weightedAverageAggregation(agentKnowledge);
    }
    
    return {
      weights: consensus.weights,
      confidence: consensus.confidence,
      accuracy: consensus.accuracy,
      contributors: agentKnowledge.length,
      agreement: consensus.agreement,
      method: 'consensus_based'
    };
  }

  _diversityEnhancedAggregation(agentKnowledge) {
    const baseAggregation = this._weightedAverageAggregation(agentKnowledge);
    const diversityBonus = this._calculateDiversityBonus(agentKnowledge);
    
    return {
      ...baseAggregation,
      diversityBonus,
      diversityIndex: this._calculateDiversityIndex(agentKnowledge),
      method: 'diversity_enhanced'
    };
  }

  _calculateAgentWeight(knowledge) {
    let weight = 1.0;
    
    // Weight by accuracy
    if (knowledge.accuracy) {
      weight *= knowledge.accuracy;
    }
    
    // Weight by confidence
    if (knowledge.confidence) {
      weight *= knowledge.confidence;
    }
    
    // Weight by reputation
    if (knowledge.reputation) {
      weight *= knowledge.reputation;
    }
    
    // Weight by contribution history
    if (knowledge.contributionHistory) {
      const avgContribution = knowledge.contributionHistory.reduce((a, b) => a + b, 0) / knowledge.contributionHistory.length;
      weight *= (1 + avgContribution);
    }
    
    return weight;
  }

  _buildConsensus(agentKnowledge) {
    const pairwiseAgreements = this._calculatePairwiseAgreements(agentKnowledge);
    const totalAgreement = pairwiseAgreements.reduce((sum, a) => sum + a, 0);
    const maxPossibleAgreement = agentKnowledge.length * (agentKnowledge.length - 1) / 2;
    const agreement = totalAgreement / maxPossibleAgreement;
    
    const consensusWeights = this._calculateConsensusWeights(agentKnowledge, pairwiseAgreements);
    
    return {
      weights: consensusWeights,
      agreement,
      confidence: agreement,
      accuracy: agreement * 0.9 // Estimate accuracy based on agreement
    };
  }

  _calculatePairwiseAgreements(agentKnowledge) {
    const agreements = [];
    
    for (let i = 0; i < agentKnowledge.length; i++) {
      for (let j = i + 1; j < agentKnowledge.length; j++) {
        const agreement = this._calculateSimilarity(
          agentKnowledge[i].weights || [],
          agentKnowledge[j].weights || []
        );
        agreements.push(agreement);
      }
    }
    
    return agreements;
  }

  _calculateSimilarity(weights1, weights2) {
    if (weights1.length !== weights2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < weights1.length; i++) {
      dotProduct += weights1[i] * weights2[i];
      norm1 += weights1[i] * weights1[i];
      norm2 += weights2[i] * weights2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  _calculateConsensusWeights(agentKnowledge, agreements) {
    const consensusWeights = new Array(10).fill(0);
    const agentScores = new Array(agentKnowledge.length).fill(0);
    
    // Calculate agent consensus scores
    let agreementIndex = 0;
    for (let i = 0; i < agentKnowledge.length; i++) {
      for (let j = 0; j < agentKnowledge.length; j++) {
        if (i !== j) {
          agentScores[i] += agreements[agreementIndex++];
        }
      }
    }
    
    // Weight agent contributions by consensus scores
    const totalScore = agentScores.reduce((sum, score) => sum + score, 0);
    
    agentKnowledge.forEach((knowledge, index) => {
      const weight = totalScore > 0 ? agentScores[index] / totalScore : 1 / agentKnowledge.length;
      
      if (knowledge.weights) {
        knowledge.weights.forEach((w, i) => {
          consensusWeights[i] += w * weight;
        });
      }
    });
    
    return consensusWeights;
  }

  _calculateDiversityBonus(agentKnowledge) {
    const diversity = this._calculateDiversityIndex(agentKnowledge);
    return diversity * this.config.diversityBonus;
  }

  _calculateDiversityIndex(agentKnowledge) {
    if (agentKnowledge.length < 2) return 0;
    
    let totalDiversity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < agentKnowledge.length; i++) {
      for (let j = i + 1; j < agentKnowledge.length; j++) {
        const similarity = this._calculateSimilarity(
          agentKnowledge[i].weights || [],
          agentKnowledge[j].weights || []
        );
        totalDiversity += (1 - similarity);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalDiversity / comparisons : 0;
  }

  _updateAgentContributions(agentKnowledge, taskId) {
    if (!this.agentContributions.has(taskId)) {
      this.agentContributions.set(taskId, new Map());
    }
    
    const taskContributions = this.agentContributions.get(taskId);
    
    agentKnowledge.forEach(knowledge => {
      const agentId = knowledge.agentId;
      const contribution = {
        accuracy: knowledge.accuracy || 0,
        confidence: knowledge.confidence || 0,
        timestamp: new Date().toISOString()
      };
      
      if (!taskContributions.has(agentId)) {
        taskContributions.set(agentId, []);
      }
      
      taskContributions.get(agentId).push(contribution);
      
      // Keep only last 10 contributions
      const contributions = taskContributions.get(agentId);
      if (contributions.length > 10) {
        contributions.shift();
      }
    });
  }

  calculateCollectiveMetrics(taskId) {
    const knowledge = this.collectiveKnowledge.get(taskId);
    const contributions = this.agentContributions.get(taskId);
    
    if (!knowledge || !contributions) {
      return this.intelligenceMetrics;
    }
    
    // Calculate collective accuracy
    this.intelligenceMetrics.collectiveAccuracy = knowledge.accuracy || 0;
    
    // Calculate diversity index
    this.intelligenceMetrics.diversityIndex = knowledge.diversityIndex || 0;
    
    // Calculate convergence rate
    this.intelligenceMetrics.convergenceRate = this._calculateConvergenceRate(taskId);
    
    // Calculate adaptation speed
    this.intelligenceMetrics.adaptationSpeed = this._calculateAdaptationSpeed(taskId);
    
    return this.intelligenceMetrics;
  }

  _calculateConvergenceRate(taskId) {
    const contributions = this.agentContributions.get(taskId);
    if (!contributions || contributions.size < 2) return 0;
    
    let totalVariance = 0;
    let agentCount = 0;
    
    for (const [agentId, agentContributions] of contributions) {
      if (agentContributions.length < 2) continue;
      
      const recent = agentContributions.slice(-5);
      const accuracies = recent.map(c => c.accuracy);
      
      const variance = this._calculateVariance(accuracies);
      totalVariance += variance;
      agentCount++;
    }
    
    const avgVariance = agentCount > 0 ? totalVariance / agentCount : 0;
    return Math.max(0, 1 - avgVariance); // Lower variance = higher convergence
  }

  _calculateVariance(values) {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return variance;
  }

  _calculateAdaptationSpeed(taskId) {
    const contributions = this.agentContributions.get(taskId);
    if (!contributions) return 0;
    
    let totalImprovements = 0;
    let totalAgents = 0;
    
    for (const [agentId, agentContributions] of contributions) {
      if (agentContributions.length < 2) continue;
      
      const recent = agentContributions.slice(-5);
      let improvements = 0;
      
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].accuracy > recent[i-1].accuracy) {
          improvements++;
        }
      }
      
      totalImprovements += improvements;
      totalAgents++;
    }
    
    return totalAgents > 0 ? totalImprovements / totalAgents : 0;
  }

  getCollectiveKnowledge(taskId) {
    return this.collectiveKnowledge.get(taskId);
  }

  getAgentContributions(taskId) {
    return this.agentContributions.get(taskId);
  }

  getIntelligenceMetrics() {
    return this.intelligenceMetrics;
  }

  updateConfiguration(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Collective intelligence configuration updated');
  }

  cleanup() {
    this.collectiveKnowledge.clear();
    this.agentContributions.clear();
    this.consensusHistory = [];
    logger.info('Collective intelligence system cleaned up');
  }
}

module.exports = CollectiveIntelligence;
