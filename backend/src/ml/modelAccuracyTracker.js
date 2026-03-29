const _ = require('lodash');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

class ModelAccuracyTracker {
  constructor() {
    this.accuracyHistory = {
      completion: [],
      performance: [],
      dropout: [],
      engagement: []
    };
    
    this.modelMetrics = {
      lastUpdated: null,
      updateFrequency: 'weekly',
      performanceThresholds: {
        completion: { minimum: 0.90, target: 0.95 },
        performance: { minimum: 0.85, target: 0.90 },
        dropout: { minimum: 0.85, target: 0.90 },
        engagement: { minimum: 0.80, target: 0.85 }
      },
      dataQuality: {
        minimumSamples: 100,
        freshnessThreshold: 30 // days
      }
    };
    
    this.dataStorage = {
      accuracyLogPath: path.join(__dirname, '../../data/accuracy_logs.json'),
      modelMetricsPath: path.join(__dirname, '../../data/model_metrics.json'),
      trainingDataPath: path.join(__dirname, '../../data/training_data.json')
    };
  }

  async initialize() {
    try {
      await this.loadHistoricalData();
      await this.ensureDataDirectories();
      console.log('Model Accuracy Tracker initialized successfully');
    } catch (error) {
      console.error('Error initializing Model Accuracy Tracker:', error);
      throw error;
    }
  }

  async trackPredictionAccuracy(modelType, prediction, actualOutcome, metadata = {}) {
    try {
      const accuracyRecord = {
        timestamp: new Date().toISOString(),
        modelType,
        prediction: this.normalizeValue(prediction),
        actualOutcome: this.normalizeValue(actualOutcome),
        accuracy: this.calculateAccuracy(prediction, actualOutcome, modelType),
        error: this.calculateError(prediction, actualOutcome, modelType),
        confidence: metadata.confidence || 0,
        studentId: metadata.studentId,
        courseId: metadata.courseId,
        features: metadata.features || {},
        modelVersion: metadata.modelVersion || '1.0'
      };

      // Add to history
      this.accuracyHistory[modelType].push(accuracyRecord);
      
      // Keep only last 1000 records per model
      if (this.accuracyHistory[modelType].length > 1000) {
        this.accuracyHistory[modelType] = this.accuracyHistory[modelType].slice(-1000);
      }

      // Save to persistent storage
      await this.saveAccuracyData();

      // Check if retraining is needed
      const retrainingNeeded = this.checkRetrainingNeeds(modelType);
      
      if (retrainingNeeded) {
        await this.triggerModelRetraining(modelType);
      }

      return accuracyRecord;

    } catch (error) {
      console.error('Error tracking prediction accuracy:', error);
      throw error;
    }
  }

  async trackBatchAccuracy(modelType, predictions, actualOutcomes, metadata = {}) {
    const batchResults = [];
    
    for (let i = 0; i < predictions.length; i++) {
      try {
        const record = await this.trackPredictionAccuracy(
          modelType,
          predictions[i],
          actualOutcomes[i],
          {
            ...metadata,
            batchIndex: i
          }
        );
        batchResults.push(record);
      } catch (error) {
        console.error(`Error tracking batch prediction ${i}:`, error);
        batchResults.push({
          error: error.message,
          batchIndex: i
        });
      }
    }

    const batchSummary = this.calculateBatchSummary(batchResults);
    
    return {
      batchResults,
      batchSummary,
      timestamp: new Date().toISOString()
    };
  }

  calculateAccuracy(prediction, actual, modelType) {
    switch (modelType) {
      case 'completion':
      case 'dropout':
      case 'engagement':
        // Binary classification accuracy
        const predBinary = prediction > 0.5 ? 1 : 0;
        const actualBinary = actual > 0.5 ? 1 : 0;
        return predBinary === actualBinary ? 1 : 0;
        
      case 'performance':
        // Regression accuracy (within 10% tolerance)
        const tolerance = 0.1;
        const difference = Math.abs(prediction - actual);
        return difference <= tolerance ? 1 : (1 - difference);
        
      default:
        // Default to simple absolute difference
        return 1 - Math.abs(prediction - actual);
    }
  }

  calculateError(prediction, actual, modelType) {
    switch (modelType) {
      case 'completion':
      case 'dropout':
      case 'engagement':
        // Binary cross-entropy
        const epsilon = 1e-7;
        prediction = Math.max(epsilon, Math.min(1 - epsilon, prediction));
        return -(actual * Math.log(prediction) + (1 - actual) * Math.log(1 - prediction));
        
      case 'performance':
        // Mean squared error
        return Math.pow(prediction - actual, 2);
        
      default:
        // Mean absolute error
        return Math.abs(prediction - actual);
    }
  }

  normalizeValue(value) {
    // Ensure value is between 0 and 1
    return Math.max(0, Math.min(1, parseFloat(value) || 0));
  }

  async getModelAccuracyMetrics(modelType = null) {
    const metrics = {};
    
    const modelTypes = modelType ? [modelType] : Object.keys(this.accuracyHistory);
    
    for (const type of modelTypes) {
      const history = this.accuracyHistory[type];
      
      if (history.length === 0) {
        metrics[type] = {
          currentAccuracy: 0,
          averageAccuracy: 0,
          trend: 'no_data',
          sampleCount: 0,
          lastUpdated: null
        };
        continue;
      }

      const recent = history.slice(-50); // Last 50 predictions
      const older = history.slice(-100, -50); // Previous 50 predictions
      
      const currentAccuracy = this.calculateAverageAccuracy(recent);
      const averageAccuracy = this.calculateAverageAccuracy(history);
      const trend = this.calculateTrend(recent, older);
      
      metrics[type] = {
        currentAccuracy,
        averageAccuracy,
        trend,
        sampleCount: history.length,
        lastUpdated: history[history.length - 1].timestamp,
        performance: this.assessModelPerformance(type, currentAccuracy),
        detailed: this.calculateDetailedMetrics(history)
      };
    }

    return metrics;
  }

  calculateAverageAccuracy(records) {
    if (records.length === 0) return 0;
    const totalAccuracy = records.reduce((sum, record) => sum + record.accuracy, 0);
    return totalAccuracy / records.length;
  }

  calculateTrend(recent, older) {
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = this.calculateAverageAccuracy(recent);
    const olderAvg = this.calculateAverageAccuracy(older);
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  assessModelPerformance(modelType, currentAccuracy) {
    const threshold = this.modelMetrics.performanceThresholds[modelType];
    
    if (!threshold) return 'unknown';
    
    if (currentAccuracy >= threshold.target) return 'excellent';
    if (currentAccuracy >= threshold.minimum) return 'acceptable';
    return 'poor';
  }

  calculateDetailedMetrics(history) {
    if (history.length === 0) return {};
    
    const accuracies = history.map(r => r.accuracy);
    const errors = history.map(r => r.error);
    const confidences = history.map(r => r.confidence);
    
    return {
      accuracyStdDev: this.calculateStandardDeviation(accuracies),
      errorMean: this.mean(errors),
      errorStdDev: this.calculateStandardDeviation(errors),
      confidenceMean: this.mean(confidences),
      confidenceStdDev: this.calculateStandardDeviation(confidences),
      accuracyByConfidence: this.groupAccuracyByConfidence(history),
      accuracyOverTime: this.calculateAccuracyOverTime(history)
    };
  }

  groupAccuracyByConfidence(history) {
    const groups = {
      high: [],   // > 0.8
      medium: [], // 0.5 - 0.8
      low: []     // < 0.5
    };
    
    history.forEach(record => {
      if (record.confidence > 0.8) groups.high.push(record.accuracy);
      else if (record.confidence >= 0.5) groups.medium.push(record.accuracy);
      else groups.low.push(record.accuracy);
    });
    
    return {
      high: groups.high.length > 0 ? this.mean(groups.high) : 0,
      medium: groups.medium.length > 0 ? this.mean(groups.medium) : 0,
      low: groups.low.length > 0 ? this.mean(groups.low) : 0
    };
  }

  calculateAccuracyOverTime(history) {
    const timeWindows = {
      day: 1,
      week: 7,
      month: 30
    };
    
    const now = moment();
    const accuracyOverTime = {};
    
    Object.keys(timeWindows).forEach(period => {
      const cutoff = now.clone().subtract(timeWindows[period], 'days');
      const recentRecords = history.filter(r => moment(r.timestamp).isAfter(cutoff));
      
      accuracyOverTime[period] = {
        accuracy: this.calculateAverageAccuracy(recentRecords),
        count: recentRecords.length
      };
    });
    
    return accuracyOverTime;
  }

  checkRetrainingNeeds(modelType) {
    const history = this.accuracyHistory[modelType];
    
    if (history.length < this.modelMetrics.dataQuality.minimumSamples) {
      return false; // Not enough data
    }
    
    const recent = history.slice(-20);
    const currentAccuracy = this.calculateAverageAccuracy(recent);
    const threshold = this.modelMetrics.performanceThresholds[modelType];
    
    // Check if accuracy is below minimum threshold
    if (threshold && currentAccuracy < threshold.minimum) {
      return true;
    }
    
    // Check if trend is declining
    const older = history.slice(-40, -20);
    const trend = this.calculateTrend(recent, older);
    
    if (trend === 'declining') {
      return true;
    }
    
    // Check if data is stale
    const lastUpdate = moment(history[history.length - 1].timestamp);
    const daysSinceUpdate = moment().diff(lastUpdate, 'days');
    
    if (daysSinceUpdate > this.modelMetrics.dataQuality.freshnessThreshold) {
      return true;
    }
    
    return false;
  }

  async triggerModelRetraining(modelType) {
    try {
      console.log(`Triggering retraining for ${modelType} model...`);
      
      // Collect training data
      const trainingData = await this.collectTrainingData(modelType);
      
      if (trainingData.length < this.modelMetrics.dataQuality.minimumSamples) {
        console.log(`Insufficient training data for ${modelType}: ${trainingData.length} samples`);
        return false;
      }
      
      // Trigger retraining (this would integrate with the actual model training)
      const retrainingResult = await this.performModelRetraining(modelType, trainingData);
      
      // Update model metrics
      this.modelMetrics.lastUpdated = new Date().toISOString();
      
      // Save updated metrics
      await this.saveModelMetrics();
      
      console.log(`Retraining completed for ${modelType} model`);
      return retrainingResult;
      
    } catch (error) {
      console.error(`Error retraining ${modelType} model:`, error);
      return false;
    }
  }

  async collectTrainingData(modelType) {
    const history = this.accuracyHistory[modelType];
    
    // Transform accuracy history into training data format
    const trainingData = history.map(record => ({
      features: record.features,
      target: record.actualOutcome,
      prediction: record.prediction,
      confidence: record.confidence,
      timestamp: record.timestamp
    }));
    
    // Filter for high-quality data
    return trainingData.filter(record => 
      record.confidence > 0.5 && 
      moment().diff(moment(record.timestamp), 'days') <= 90
    );
  }

  async performModelRetraining(modelType, trainingData) {
    // This would integrate with the actual ML model retraining
    // For now, simulate the retraining process
    
    console.log(`Starting retraining for ${modelType} with ${trainingData.length} samples`);
    
    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate expected improvement
    const currentAccuracy = this.calculateAverageAccuracy(
      this.accuracyHistory[modelType].slice(-20)
    );
    const expectedImprovement = Math.min(0.1, (0.95 - currentAccuracy) * 0.5);
    
    return {
      modelType,
      trainingSamples: trainingData.length,
      previousAccuracy: currentAccuracy,
      expectedAccuracy: Math.min(0.95, currentAccuracy + expectedImprovement),
      improvement: expectedImprovement,
      timestamp: new Date().toISOString()
    };
  }

  async generateAccuracyReport(timeframe = 'month') {
    try {
      const report = {
        period: timeframe,
        generatedAt: new Date().toISOString(),
        summary: {},
        modelMetrics: await this.getModelAccuracyMetrics(),
        recommendations: [],
        dataQuality: this.assessDataQuality()
      };
      
      // Calculate overall summary
      const allMetrics = Object.values(report.modelMetrics);
      const avgAccuracy = this.mean(allMetrics.map(m => m.currentAccuracy));
      const improvingModels = allMetrics.filter(m => m.trend === 'improving').length;
      const decliningModels = allMetrics.filter(m => m.trend === 'declining').length;
      
      report.summary = {
        overallAccuracy: avgAccuracy,
        modelsTracked: allMetrics.length,
        improvingModels,
        decliningModels,
        needsAttention: decliningModels > 0
      };
      
      // Generate recommendations
      report.recommendations = this.generateRecommendations(report.modelMetrics);
      
      return report;
      
    } catch (error) {
      console.error('Error generating accuracy report:', error);
      throw error;
    }
  }

  assessDataQuality() {
    const quality = {
      totalSamples: 0,
      freshSamples: 0,
      highConfidenceSamples: 0,
      qualityScore: 0,
      issues: []
    };
    
    Object.values(this.accuracyHistory).forEach(history => {
      history.forEach(record => {
        quality.totalSamples++;
        
        // Check freshness (last 30 days)
        if (moment().diff(moment(record.timestamp), 'days') <= 30) {
          quality.freshSamples++;
        }
        
        // Check confidence
        if (record.confidence > 0.7) {
          quality.highConfidenceSamples++;
        }
      });
    });
    
    // Calculate quality score
    const freshnessRatio = quality.freshSamples / Math.max(1, quality.totalSamples);
    const confidenceRatio = quality.highConfidenceSamples / Math.max(1, quality.totalSamples);
    
    quality.qualityScore = (freshnessRatio * 0.6 + confidenceRatio * 0.4);
    
    // Identify issues
    if (quality.totalSamples < this.modelMetrics.dataQuality.minimumSamples) {
      quality.issues.push('Insufficient total samples');
    }
    
    if (freshnessRatio < 0.5) {
      quality.issues.push('Data is too old');
    }
    
    if (confidenceRatio < 0.6) {
      quality.issues.push('Low confidence in predictions');
    }
    
    return quality;
  }

  generateRecommendations(modelMetrics) {
    const recommendations = [];
    
    Object.keys(modelMetrics).forEach(modelType => {
      const metrics = modelMetrics[modelType];
      
      if (metrics.performance === 'poor') {
        recommendations.push({
          priority: 'high',
          modelType,
          action: 'immediate_retraining',
          description: `${modelType} model performance is poor - immediate retraining recommended`
        });
      } else if (metrics.trend === 'declining') {
        recommendations.push({
          priority: 'medium',
          modelType,
          action: 'monitor_and_retrain',
          description: `${modelType} model accuracy is declining - monitor closely and consider retraining`
        });
      }
      
      if (metrics.sampleCount < this.modelMetrics.dataQuality.minimumSamples) {
        recommendations.push({
          priority: 'low',
          modelType,
          action: 'collect_more_data',
          description: `Insufficient data for ${modelType} model - collect more samples`
        });
      }
    });
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Utility methods
  mean(values) {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const mean = this.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  calculateBatchSummary(batchResults) {
    const successful = batchResults.filter(r => !r.error);
    const failed = batchResults.filter(r => r.error);
    
    if (successful.length === 0) {
      return {
        totalRecords: batchResults.length,
        successful: 0,
        failed: failed.length,
        averageAccuracy: 0,
        errorRate: 1
      };
    }
    
    const accuracies = successful.map(r => r.accuracy);
    
    return {
      totalRecords: batchResults.length,
      successful: successful.length,
      failed: failed.length,
      averageAccuracy: this.mean(accuracies),
      accuracyStdDev: this.calculateStandardDeviation(accuracies),
      errorRate: failed.length / batchResults.length
    };
  }

  // Data persistence methods
  async loadHistoricalData() {
    try {
      // Load accuracy history
      const accuracyData = await this.loadJsonFile(this.dataStorage.accuracyLogPath);
      if (accuracyData) {
        this.accuracyHistory = { ...this.accuracyHistory, ...accuracyData };
      }
      
      // Load model metrics
      const metricsData = await this.loadJsonFile(this.dataStorage.modelMetricsPath);
      if (metricsData) {
        this.modelMetrics = { ...this.modelMetrics, ...metricsData };
      }
      
    } catch (error) {
      console.log('No existing historical data found, starting fresh');
    }
  }

  async saveAccuracyData() {
    try {
      await this.saveJsonFile(this.dataStorage.accuracyLogPath, this.accuracyHistory);
    } catch (error) {
      console.error('Error saving accuracy data:', error);
    }
  }

  async saveModelMetrics() {
    try {
      await this.saveJsonFile(this.dataStorage.modelMetricsPath, this.modelMetrics);
    } catch (error) {
      console.error('Error saving model metrics:', error);
    }
  }

  async ensureDataDirectories() {
    const dataDir = path.dirname(this.dataStorage.accuracyLogPath);
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async loadJsonFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  async saveJsonFile(filePath, data) {
    await this.ensureDataDirectories();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

module.exports = ModelAccuracyTracker;
