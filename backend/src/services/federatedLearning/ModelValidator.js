const logger = require('../../utils/logger');

class ModelValidator {
  constructor(options = {}) {
    this.config = {
      fairnessThreshold: options.fairnessThreshold || 0.8,
      accuracyThreshold: options.accuracyThreshold || 0.7,
      biasThreshold: options.biasThreshold || 0.1,
      minDataSize: options.minDataSize || 100,
      maxVariance: options.maxVariance || 0.5,
      ...options
    };
    
    this.validationHistory = [];
    this.fairnessMetrics = new Map();
    this.baselineMetrics = null;
  }

  /**
   * Validate federated learning model update
   */
  async validateModelUpdate(modelUpdate, participantInfo, validationData = null) {
    const validationResults = {
      participantId: participantInfo.id,
      timestamp: new Date().toISOString(),
      passed: true,
      warnings: [],
      errors: [],
      metrics: {}
    };

    try {
      // Basic validation checks
      await this._validateBasicConstraints(modelUpdate, validationResults);
      
      // Fairness validation
      await this._validateFairness(modelUpdate, participantInfo, validationResults, validationData);
      
      // Quality validation
      await this._validateQuality(modelUpdate, validationResults, validationData);
      
      // Security validation
      await this._validateSecurity(modelUpdate, participantInfo, validationResults);
      
      // Performance validation
      await this._validatePerformance(modelUpdate, validationResults, validationData);

      // Determine overall validation status
      validationResults.passed = validationResults.errors.length === 0;

      // Store validation history
      this.validationHistory.push(validationResults);
      
      logger.info(`Model validation completed for participant ${participantInfo.id}: ${validationResults.passed ? 'PASSED' : 'FAILED'}`);
      
      return validationResults;

    } catch (error) {
      logger.error(`Model validation failed for participant ${participantInfo.id}:`, error);
      validationResults.passed = false;
      validationResults.errors.push(`Validation error: ${error.message}`);
      return validationResults;
    }
  }

  /**
   * Basic constraint validation
   */
  async _validateBasicConstraints(modelUpdate, results) {
    // Check if model weights are valid numbers
    for (const [layerName, weights] of Object.entries(modelUpdate.weights || {})) {
      if (Array.isArray(weights)) {
        for (let i = 0; i < weights.length; i++) {
          if (!isFinite(weights[i]) || isNaN(weights[i])) {
            results.errors.push(`Invalid weight at ${layerName}[${i}]: ${weights[i]}`);
          }
        }
      } else if (!isFinite(weights) || isNaN(weights)) {
        results.errors.push(`Invalid weight at ${layerName}: ${weights}`);
      }
    }

    // Check weight magnitude
    const maxWeight = this._getMaxWeight(modelUpdate.weights);
    if (maxWeight > 100) {
      results.warnings.push(`Large weight magnitude detected: ${maxWeight}`);
    }

    // Check data size
    if (modelUpdate.dataSize && modelUpdate.dataSize < this.config.minDataSize) {
      results.warnings.push(`Small dataset size: ${modelUpdate.dataSize}`);
    }

    results.metrics.maxWeight = maxWeight;
    results.metrics.dataSize = modelUpdate.dataSize || 0;
  }

  /**
   * Fairness validation
   */
  async _validateFairness(modelUpdate, participantInfo, results, validationData) {
    if (!validationData) {
      results.warnings.push('No validation data provided for fairness assessment');
      return;
    }

    try {
      const fairnessMetrics = await this._calculateFairnessMetrics(modelUpdate, validationData);
      results.metrics.fairness = fairnessMetrics;

      // Check demographic parity
      if (fairnessMetrics.demographicParity < this.config.fairnessThreshold) {
        results.errors.push(`Demographic parity below threshold: ${fairnessMetrics.demographicParity}`);
      }

      // Check equal opportunity
      if (fairnessMetrics.equalOpportunity < this.config.fairnessThreshold) {
        results.warnings.push(`Equal opportunity below threshold: ${fairnessMetrics.equalOpportunity}`);
      }

      // Check disparate impact
      if (fairnessMetrics.disparateImpact < 0.8 || fairnessMetrics.disparateImpact > 1.25) {
        results.warnings.push(`Disparate impact out of acceptable range: ${fairnessMetrics.disparateImpact}`);
      }

      // Store fairness metrics for participant
      this.fairnessMetrics.set(participantInfo.id, fairnessMetrics);

    } catch (error) {
      results.warnings.push(`Fairness validation failed: ${error.message}`);
    }
  }

  /**
   * Quality validation
   */
  async _validateQuality(modelUpdate, results, validationData) {
    if (!validationData) {
      results.warnings.push('No validation data provided for quality assessment');
      return;
    }

    try {
      const qualityMetrics = await this._calculateQualityMetrics(modelUpdate, validationData);
      results.metrics.quality = qualityMetrics;

      // Check accuracy
      if (qualityMetrics.accuracy < this.config.accuracyThreshold) {
        results.warnings.push(`Low accuracy: ${qualityMetrics.accuracy}`);
      }

      // Check loss
      if (qualityMetrics.loss > 2.0) {
        results.warnings.push(`High loss: ${qualityMetrics.loss}`);
      }

      // Check variance
      if (qualityMetrics.variance > this.config.maxVariance) {
        results.warnings.push(`High variance: ${qualityMetrics.variance}`);
      }

      // Check for overfitting
      if (qualityMetrics.overfittingScore > 0.3) {
        results.warnings.push(`Potential overfitting detected: ${qualityMetrics.overfittingScore}`);
      }

    } catch (error) {
      results.warnings.push(`Quality validation failed: ${error.message}`);
    }
  }

  /**
   * Security validation
   */
  async _validateSecurity(modelUpdate, participantInfo, results) {
    // Check for anomalous weight patterns
    const anomalyScore = this._detectAnomalies(modelUpdate.weights);
    results.metrics.anomalyScore = anomalyScore;

    if (anomalyScore > 0.8) {
      results.errors.push(`High anomaly score detected: ${anomalyScore}`);
    } else if (anomalyScore > 0.6) {
      results.warnings.push(`Moderate anomaly score: ${anomalyScore}`);
    }

    // Check for potential poisoning attacks
    const poisoningScore = this._detectPoisoning(modelUpdate);
    results.metrics.poisoningScore = poisoningScore;

    if (poisoningScore > 0.7) {
      results.errors.push(`Potential poisoning attack detected: ${poisoningScore}`);
    }

    // Check participant reputation
    if (participantInfo.reputation < 0.5) {
      results.warnings.push(`Low participant reputation: ${participantInfo.reputation}`);
    }
  }

  /**
   * Performance validation
   */
  async _validatePerformance(modelUpdate, results, validationData) {
    try {
      const performanceMetrics = await this._calculatePerformanceMetrics(modelUpdate, validationData);
      results.metrics.performance = performanceMetrics;

      // Check inference time
      if (performanceMetrics.inferenceTime > 1000) { // 1 second
        results.warnings.push(`Slow inference time: ${performanceMetrics.inferenceTime}ms`);
      }

      // Check memory usage
      if (performanceMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
        results.warnings.push(`High memory usage: ${(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
      }

      // Check model size
      const modelSize = this._calculateModelSize(modelUpdate.weights);
      results.metrics.modelSize = modelSize;

      if (modelSize > 50 * 1024 * 1024) { // 50MB
        results.warnings.push(`Large model size: ${(modelSize / 1024 / 1024).toFixed(2)}MB`);
      }

    } catch (error) {
      results.warnings.push(`Performance validation failed: ${error.message}`);
    }
  }

  /**
   * Calculate fairness metrics
   */
  async _calculateFairnessMetrics(modelUpdate, validationData) {
    // Simplified fairness calculation
    // In production, this would use actual model predictions
    
    const predictions = this._generateMockPredictions(validationData);
    const labels = validationData.labels || [];
    const sensitiveAttributes = validationData.sensitiveAttributes || [];

    const metrics = {
      demographicParity: this._calculateDemographicParity(predictions, sensitiveAttributes),
      equalOpportunity: this._calculateEqualOpportunity(predictions, labels, sensitiveAttributes),
      disparateImpact: this._calculateDisparateImpact(predictions, sensitiveAttributes),
      overallFairness: 0
    };

    // Calculate overall fairness score
    metrics.overallFairness = (metrics.demographicParity + metrics.equalOpportunity + 
                              Math.min(1, metrics.disparateImpact)) / 3;

    return metrics;
  }

  /**
   * Calculate quality metrics
   */
  async _calculateQualityMetrics(modelUpdate, validationData) {
    const predictions = this._generateMockPredictions(validationData);
    const labels = validationData.labels || [];

    return {
      accuracy: this._calculateAccuracy(predictions, labels),
      precision: this._calculatePrecision(predictions, labels),
      recall: this._calculateRecall(predictions, labels),
      f1Score: this._calculateF1Score(predictions, labels),
      loss: Math.random() * 0.5 + 0.1, // Mock loss
      variance: Math.random() * 0.3 + 0.1, // Mock variance
      overfittingScore: Math.random() * 0.2 // Mock overfitting score
    };
  }

  /**
   * Calculate performance metrics
   */
  async _calculatePerformanceMetrics(modelUpdate, validationData) {
    return {
      inferenceTime: Math.random() * 500 + 100, // Mock inference time in ms
      memoryUsage: Math.random() * 50 * 1024 * 1024 + 10 * 1024 * 1024, // Mock memory usage
      throughput: Math.random() * 1000 + 500 // Mock predictions per second
    };
  }

  /**
   * Detect anomalies in model weights
   */
  _detectAnomalies(weights) {
    let anomalyScore = 0;
    let weightCount = 0;

    for (const [layerName, layerWeights] of Object.entries(weights || {})) {
      if (Array.isArray(layerWeights)) {
        for (const weight of layerWeights) {
          if (Math.abs(weight) > 10) {
            anomalyScore += 0.1;
          }
          if (Math.abs(weight) > 100) {
            anomalyScore += 0.3;
          }
          weightCount++;
        }
      }
    }

    return Math.min(1, anomalyScore / Math.max(1, weightCount));
  }

  /**
   * Detect potential poisoning attacks
   */
  _detectPoisoning(modelUpdate) {
    let poisoningScore = 0;

    // Check for extreme weight values
    const maxWeight = this._getMaxWeight(modelUpdate.weights);
    if (maxWeight > 50) {
      poisoningScore += 0.3;
    }

    // Check for unusual weight distributions
    const weightVariance = this._calculateWeightVariance(modelUpdate.weights);
    if (weightVariance > 10) {
      poisoningScore += 0.2;
    }

    // Check for rapid weight changes
    if (modelUpdate.weightChangeRate && modelUpdate.weightChangeRate > 5) {
      poisoningScore += 0.3;
    }

    return Math.min(1, poisoningScore);
  }

  /**
   * Helper methods for metric calculations
   */
  _generateMockPredictions(validationData) {
    // Generate mock predictions for testing
    const size = validationData.features?.length || 100;
    return Array(size).fill(0).map(() => Math.random() > 0.5 ? 1 : 0);
  }

  _calculateDemographicParity(predictions, sensitiveAttributes) {
    // Simplified demographic parity calculation
    const groups = this._groupBySensitiveAttribute(predictions, sensitiveAttributes);
    let paritySum = 0;
    let groupCount = 0;

    for (const group of Object.values(groups)) {
      const positiveRate = group.filter(p => p === 1).length / group.length;
      paritySum += positiveRate;
      groupCount++;
    }

    const avgPositiveRate = paritySum / groupCount;
    let varianceSum = 0;

    for (const group of Object.values(groups)) {
      const positiveRate = group.filter(p => p === 1).length / group.length;
      varianceSum += Math.abs(positiveRate - avgPositiveRate);
    }

    return Math.max(0, 1 - varianceSum / groupCount);
  }

  _calculateEqualOpportunity(predictions, labels, sensitiveAttributes) {
    // Simplified equal opportunity calculation
    const groups = this._groupBySensitiveAttribute(
      predictions.map((p, i) => ({ pred: p, label: labels[i] })),
      sensitiveAttributes
    );

    let tprSum = 0;
    let groupCount = 0;

    for (const group of Object.values(groups)) {
      const truePositives = group.filter(item => item.pred === 1 && item.label === 1).length;
      const actualPositives = group.filter(item => item.label === 1).length;
      const tpr = actualPositives > 0 ? truePositives / actualPositives : 0;
      
      tprSum += tpr;
      groupCount++;
    }

    const avgTpr = tprSum / groupCount;
    let varianceSum = 0;

    for (const group of Object.values(groups)) {
      const truePositives = group.filter(item => item.pred === 1 && item.label === 1).length;
      const actualPositives = group.filter(item => item.label === 1).length;
      const tpr = actualPositives > 0 ? truePositives / actualPositives : 0;
      
      varianceSum += Math.abs(tpr - avgTpr);
    }

    return Math.max(0, 1 - varianceSum / groupCount);
  }

  _calculateDisparateImpact(predictions, sensitiveAttributes) {
    // Simplified disparate impact calculation
    const groups = this._groupBySensitiveAttribute(predictions, sensitiveAttributes);
    const groupRates = [];

    for (const group of Object.values(groups)) {
      const positiveRate = group.filter(p => p === 1).length / group.length;
      groupRates.push(positiveRate);
    }

    if (groupRates.length < 2) return 1.0;

    const maxRate = Math.max(...groupRates);
    const minRate = Math.min(...groupRates);

    return minRate > 0 ? maxRate / minRate : 1.0;
  }

  _calculateAccuracy(predictions, labels) {
    if (predictions.length !== labels.length) return 0;
    
    const correct = predictions.reduce((sum, pred, i) => 
      sum + (pred === labels[i] ? 1 : 0), 0);
    
    return correct / predictions.length;
  }

  _calculatePrecision(predictions, labels) {
    const truePositives = predictions.reduce((sum, pred, i) => 
      sum + (pred === 1 && labels[i] === 1 ? 1 : 0), 0);
    const falsePositives = predictions.reduce((sum, pred, i) => 
      sum + (pred === 1 && labels[i] === 0 ? 1 : 0), 0);
    
    return truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
  }

  _calculateRecall(predictions, labels) {
    const truePositives = predictions.reduce((sum, pred, i) => 
      sum + (pred === 1 && labels[i] === 1 ? 1 : 0), 0);
    const falseNegatives = predictions.reduce((sum, pred, i) => 
      sum + (pred === 0 && labels[i] === 1 ? 1 : 0), 0);
    
    return truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
  }

  _calculateF1Score(predictions, labels) {
    const precision = this._calculatePrecision(predictions, labels);
    const recall = this._calculateRecall(predictions, labels);
    
    return precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  }

  _groupBySensitiveAttribute(data, sensitiveAttributes) {
    // Simplified grouping - in practice, this would use actual sensitive attributes
    const groups = {};
    const groupSize = Math.ceil(data.length / 2); // Assume 2 groups for simplicity
    
    groups.group1 = data.slice(0, groupSize);
    groups.group2 = data.slice(groupSize);
    
    return groups;
  }

  _getMaxWeight(weights) {
    let maxWeight = 0;
    
    for (const layerWeights of Object.values(weights || {})) {
      if (Array.isArray(layerWeights)) {
        for (const weight of layerWeights) {
          maxWeight = Math.max(maxWeight, Math.abs(weight));
        }
      } else {
        maxWeight = Math.max(maxWeight, Math.abs(layerWeights));
      }
    }
    
    return maxWeight;
  }

  _calculateWeightVariance(weights) {
    const allWeights = [];
    
    for (const layerWeights of Object.values(weights || {})) {
      if (Array.isArray(layerWeights)) {
        allWeights.push(...layerWeights);
      } else {
        allWeights.push(layerWeights);
      }
    }

    if (allWeights.length === 0) return 0;

    const mean = allWeights.reduce((sum, w) => sum + w, 0) / allWeights.length;
    const variance = allWeights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / allWeights.length;
    
    return variance;
  }

  _calculateModelSize(weights) {
    let size = 0;
    
    for (const layerWeights of Object.values(weights || {})) {
      if (Array.isArray(layerWeights)) {
        size += layerWeights.length * 8; // Assume 8 bytes per weight
      } else {
        size += 8;
      }
    }
    
    return size;
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    const totalValidations = this.validationHistory.length;
    const passedValidations = this.validationHistory.filter(v => v.passed).length;
    
    return {
      totalValidations,
      passedValidations,
      failedValidations: totalValidations - passedValidations,
      passRate: totalValidations > 0 ? passedValidations / totalValidations : 0,
      averageAccuracy: this._calculateAverageMetric('accuracy'),
      averageFairness: this._calculateAverageMetric('fairness'),
      recentValidations: this.validationHistory.slice(-10)
    };
  }

  _calculateAverageMetric(metricPath) {
    if (this.validationHistory.length === 0) return 0;

    const values = this.validationHistory
      .map(v => this._getNestedValue(v.metrics, metricPath))
      .filter(v => v !== null && v !== undefined);

    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  _getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

module.exports = ModelValidator;
