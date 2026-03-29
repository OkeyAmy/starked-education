const tf = require('@tensorflow/tfjs');
const { LinearRegression, PolynomialRegression } = require('ml-regression');
const ss = require('simple-statistics');
const moment = require('moment');
const _ = require('lodash');

class LearningOutcomePredictionEngine {
  constructor() {
    this.models = {
      completion: null,
      performance: null,
      dropout: null,
      engagement: null
    };
    this.featurePipeline = new FeaturePipeline();
    this.ensembleWeights = {
      completion: { linear: 0.2, polynomial: 0.2, neural: 0.4, randomForest: 0.2 },
      performance: { linear: 0.3, polynomial: 0.2, neural: 0.3, randomForest: 0.2 },
      dropout: { linear: 0.15, polynomial: 0.15, neural: 0.5, randomForest: 0.2 },
      engagement: { linear: 0.25, polynomial: 0.25, neural: 0.3, randomForest: 0.2 }
    };
    this.accuracyTracker = new AccuracyTracker();
    this.targetAccuracy = 0.90; // 90% accuracy target
    this.modelVersions = {};
    this.lastTrainingDate = null;
  }

  async initializeModels() {
    try {
      // Initialize neural network models
      this.models.completion = await this.createCompletionModel();
      this.models.performance = await this.createPerformanceModel();
      this.models.dropout = await this.createDropoutModel();
      this.models.engagement = await this.createEngagementModel();
      
      console.log('ML models initialized successfully');
    } catch (error) {
      console.error('Error initializing models:', error);
      throw error;
    }
  }

  async createCompletionModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [18], units: 128, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall', 'auc']
    });

    return model;
  }

  async createPerformanceModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.15 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae', 'mse']
    });

    return model;
  }

  async createDropoutModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 128, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.0005),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    return model;
  }

  async createEngagementModel() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 8, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  async trainModels(trainingData) {
    const { features, labels } = this.featurePipeline.prepareTrainingData(trainingData);
    
    const results = {};
    
    // Train completion model
    if (labels.completion) {
      results.completion = await this.trainModel(
        this.models.completion,
        features.completion,
        labels.completion,
        'completion'
      );
    }

    // Train performance model
    if (labels.performance) {
      results.performance = await this.trainModel(
        this.models.performance,
        features.performance,
        labels.performance,
        'performance'
      );
    }

    // Train dropout model
    if (labels.dropout) {
      results.dropout = await this.trainModel(
        this.models.dropout,
        features.dropout,
        labels.dropout,
        'dropout'
      );
    }

    // Train engagement model
    if (labels.engagement) {
      results.engagement = await this.trainModel(
        this.models.engagement,
        features.engagement,
        labels.engagement,
        'engagement'
      );
    }

    return results;
  }

  async trainModel(model, X, y, modelType) {
    const epochs = modelType === 'dropout' ? 150 : 100;
    const batchSize = 32;
    
    const history = await model.fit(X, y, {
      epochs,
      batchSize,
      validationSplit: 0.2,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 20 === 0) {
            console.log(`${modelType} - Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}`);
          }
        }
      }
    });

    return {
      modelType,
      finalLoss: history.history.loss[history.history.loss.length - 1],
      finalAccuracy: history.history.accuracy ? 
        history.history.accuracy[history.history.accuracy.length - 1] : null
    };
  }

  async predictStudentOutcomes(studentData) {
    const features = this.featurePipeline.extractFeatures(studentData);
    const predictions = {};

    try {
      // Neural network predictions
      const neuralPredictions = await this.getNeuralPredictions(features);
      
      // Ensemble predictions
      predictions.completion = this.ensemblePredict(
        features.completion,
        neuralPredictions.completion,
        'completion'
      );
      
      predictions.performance = this.ensemblePredict(
        features.performance,
        neuralPredictions.performance,
        'performance'
      );
      
      predictions.dropout = this.ensemblePredict(
        features.dropout,
        neuralPredictions.dropout,
        'dropout'
      );
      
      predictions.engagement = this.ensemblePredict(
        features.engagement,
        neuralPredictions.engagement,
        'engagement'
      );

      // Add confidence scores
      predictions.confidence = this.calculateConfidence(predictions);
      
      // Add risk assessment
      predictions.riskAssessment = this.assessRisk(predictions);
      
      return predictions;

    } catch (error) {
      console.error('Prediction error:', error);
      throw new Error('Failed to generate predictions');
    }
  }

  async getNeuralPredictions(features) {
    const predictions = {};

    if (this.models.completion && features.completion) {
      const tensorFeatures = tf.tensor2d([features.completion]);
      const prediction = await this.models.completion.predict(tensorFeatures);
      predictions.completion = await prediction.data();
      tensorFeatures.dispose();
      prediction.dispose();
    }

    if (this.models.performance && features.performance) {
      const tensorFeatures = tf.tensor2d([features.performance]);
      const prediction = await this.models.performance.predict(tensorFeatures);
      predictions.performance = await prediction.data();
      tensorFeatures.dispose();
      prediction.dispose();
    }

    if (this.models.dropout && features.dropout) {
      const tensorFeatures = tf.tensor2d([features.dropout]);
      const prediction = await this.models.dropout.predict(tensorFeatures);
      predictions.dropout = await prediction.data();
      tensorFeatures.dispose();
      prediction.dispose();
    }

    if (this.models.engagement && features.engagement) {
      const tensorFeatures = tf.tensor2d([features.engagement]);
      const prediction = await this.models.engagement.predict(tensorFeatures);
      predictions.engagement = await prediction.data();
      tensorFeatures.dispose();
      prediction.dispose();
    }

    return predictions;
  }

  ensemblePredict(features, neuralPrediction, modelType) {
    // Linear regression fallback
    let linearPrediction = 0;
    if (features && features.length > 0) {
      const linearReg = new LinearRegression(features.map((f, i) => [i]), [neuralPrediction[0]]);
      linearPrediction = linearReg.predict([features.length - 1])[0];
    }

    // Polynomial regression fallback
    let polynomialPrediction = 0;
    if (features && features.length > 2) {
      const polyReg = new PolynomialRegression(features.map((f, i) => [i]), [neuralPrediction[0]], 2);
      polynomialPrediction = polyReg.predict([features.length - 1])[0];
    }

    // Random forest prediction (simplified version for ensemble)
    let randomForestPrediction = neuralPrediction[0];
    if (features && features.length > 5) {
      // Use moving average and volatility as simple forest features
      const recentFeatures = features.slice(-5);
      const trend = ss.mean(recentFeatures) - ss.mean(features.slice(-10, -5));
      const volatility = ss.standardDeviation(recentFeatures);
      randomForestPrediction = neuralPrediction[0] + (trend * 0.1) - (volatility * 0.05);
    }

    const weights = this.ensembleWeights[modelType];
    const ensemblePrediction = (
      weights.linear * linearPrediction +
      weights.polynomial * polynomialPrediction +
      weights.neural * neuralPrediction[0] +
      weights.randomForest * randomForestPrediction
    );

    return Math.max(0, Math.min(1, ensemblePrediction)); // Clamp between 0 and 1
  }

  calculateConfidence(predictions) {
    const variance = ss.standardDeviation([
      predictions.completion,
      predictions.performance,
      1 - predictions.dropout, // Invert dropout for consistency
      predictions.engagement
    ]);
    
    // Higher confidence when variance is low
    return Math.max(0.5, 1 - variance);
  }

  assessRisk(predictions) {
    const dropoutRisk = predictions.dropout;
    const performanceRisk = 1 - predictions.performance;
    const engagementRisk = 1 - predictions.engagement;
    
    const overallRisk = (dropoutRisk * 0.5 + performanceRisk * 0.3 + engagementRisk * 0.2);
    
    return {
      overall: overallRisk,
      dropout: dropoutRisk,
      performance: performanceRisk,
      engagement: engagementRisk,
      level: this.getRiskLevel(overallRisk)
    };
  }

  getRiskLevel(riskScore) {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    if (riskScore >= 0.2) return 'low';
    return 'minimal';
  }

  async updateModels(newData) {
    // Retrain models with new data for continuous learning
    const trainingResults = await this.trainModels(newData);
    
    // Update accuracy tracking
    this.accuracyTracker.updateAccuracy(trainingResults);
    
    return trainingResults;
  }

  getModelAccuracy() {
    return this.accuracyTracker.getAccuracyMetrics();
  }
}

class FeaturePipeline {
  constructor() {
    this.featureScaling = {
      mean: {},
      std: {}
    };
  }

  prepareTrainingData(rawData) {
    const features = {
      completion: [],
      performance: [],
      dropout: [],
      engagement: []
    };
    
    const labels = {
      completion: [],
      performance: [],
      dropout: [],
      engagement: []
    };

    rawData.forEach(student => {
      const studentFeatures = this.extractFeatures(student);
      
      // Add features to respective arrays
      if (studentFeatures.completion) {
        features.completion.push(studentFeatures.completion);
        labels.completion.push(student.courseCompleted ? 1 : 0);
      }
      
      if (studentFeatures.performance) {
        features.performance.push(studentFeatures.performance);
        labels.performance.push(student.finalGrade || 0);
      }
      
      if (studentFeatures.dropout) {
        features.dropout.push(studentFeatures.dropout);
        labels.dropout.push(student.droppedOut ? 1 : 0);
      }
      
      if (studentFeatures.engagement) {
        features.engagement.push(studentFeatures.engagement);
        labels.engagement.push(student.engagementScore || 0);
      }
    });

    // Normalize features
    Object.keys(features).forEach(key => {
      if (features[key].length > 0) {
        features[key] = this.normalizeFeatures(features[key], key);
      }
    });

    return { features, labels };
  }

  extractFeatures(studentData) {
    const features = {};

    // Completion prediction features (15 features)
    features.completion = [
      this.normalizeGrade(studentData.averageGrade || 0),
      this.normalizeTimeSpent(studentData.timeSpent || 0),
      this.normalizeProgress(studentData.progress || 0),
      this.normalizeCount(studentData.assignmentsCompleted || 0),
      this.normalizeCount(studentData.quizzesCompleted || 0),
      this.normalizeEngagement(studentData.engagementScore || 0),
      this.normalizeFrequency(studentData.loginFrequency || 0),
      this.normalizeTime(studentData.lastLoginDays || 0),
      this.normalizeCount(studentData.forumPosts || 0),
      this.normalizeRating(studentData.courseRating || 0),
      this.normalizeDifficulty(studentData.courseDifficulty || 0),
      this.normalizeCount(studentData.peersConnected || 0),
      this.normalizeTime(studentData.averageSessionDuration || 0),
      this.normalizeScore(studentData.skillAssessment || 0),
      this.normalizeMotivation(studentData.motivationLevel || 0)
    ];

    // Performance prediction features (12 features)
    features.performance = [
      this.normalizeGrade(studentData.averageGrade || 0),
      this.normalizeTimeSpent(studentData.timeSpent || 0),
      this.normalizeProgress(studentData.progress || 0),
      this.normalizeCount(studentData.assignmentsCompleted || 0),
      this.normalizeScore(studentData.quizAverage || 0),
      this.normalizeEngagement(studentData.engagementScore || 0),
      this.normalizeDifficulty(studentData.courseDifficulty || 0),
      this.normalizeScore(studentData.priorKnowledge || 0),
      this.normalizeTime(studentData.studyTimePerWeek || 0),
      this.normalizeCount(studentData.helpRequests || 0),
      this.normalizeRating(studentData.instructorRating || 0),
      this.normalizeScore(studentData.learningStyle || 0)
    ];

    // Dropout prediction features (20 features)
    features.dropout = [
      this.normalizeGrade(studentData.averageGrade || 0),
      this.normalizeTimeSpent(studentData.timeSpent || 0),
      this.normalizeProgress(studentData.progress || 0),
      this.normalizeEngagement(studentData.engagementScore || 0),
      this.normalizeFrequency(studentData.loginFrequency || 0),
      this.normalizeTime(studentData.lastLoginDays || 0),
      this.normalizeCount(studentData.missedDeadlines || 0),
      this.normalizeScore(studentData.stressLevel || 0),
      this.normalizeMotivation(studentData.motivationLevel || 0),
      this.normalizeDifficulty(studentData.courseDifficulty || 0),
      this.normalizeTime(studentData.timeSinceLastActivity || 0),
      this.normalizeCount(studentData.incompleteAssignments || 0),
      this.normalizeRating(studentData.satisfactionScore || 0),
      this.normalizeCount(studentData.peersConnected || 0),
      this.normalizeScore(studentData.financialStress || 0),
      this.normalizeTime(studentData.averageSessionDuration || 0),
      this.normalizeCount(studentData.helpRequests || 0),
      this.normalizeScore(studentData.techComfort || 0),
      this.normalizeFrequency(studentData.participationRate || 0),
      this.normalizeScore(studentData.workLifeBalance || 0)
    ];

    // Engagement prediction features (10 features)
    features.engagement = [
      this.normalizeEngagement(studentData.engagementScore || 0),
      this.normalizeFrequency(studentData.loginFrequency || 0),
      this.normalizeTime(studentData.averageSessionDuration || 0),
      this.normalizeCount(studentData.forumPosts || 0),
      this.normalizeCount(studentData.peersConnected || 0),
      this.normalizeCount(studentData.helpRequests || 0),
      this.normalizeFrequency(studentData.participationRate || 0),
      this.normalizeRating(studentData.satisfactionScore || 0),
      this.normalizeMotivation(studentData.motivationLevel || 0),
      this.normalizeTime(studentData.timeSpent || 0)
    ];

    return features;
  }

  normalizeFeatures(features, featureType) {
    if (features.length === 0) return features;
    
    const numFeatures = features[0].length;
    const normalized = [];
    
    for (let i = 0; i < numFeatures; i++) {
      const column = features.map(row => row[i]);
      const mean = ss.mean(column);
      const std = ss.standardDeviation(column);
      
      // Store scaling parameters
      this.featureScaling.mean[`${featureType}_${i}`] = mean;
      this.featureScaling.std[`${featureType}_${i}`] = std || 1;
      
      // Normalize column
      const normalizedColumn = column.map(value => 
        (value - mean) / (std || 1)
      );
      
      // Add to normalized features
      normalizedColumn.forEach((value, rowIndex) => {
        if (!normalized[rowIndex]) normalized[rowIndex] = [];
        normalized[rowIndex][i] = value;
      });
    }
    
    return normalized;
  }

  // Normalization helper functions
  normalizeGrade(grade) { return grade / 100; }
  normalizeTimeSpent(minutes) { return Math.min(minutes / (40 * 60), 1); } // 40 hours max
  normalizeProgress(progress) { return progress / 100; }
  normalizeCount(count) { return Math.min(count / 50, 1); } // 50 max
  getModelAccuracy() {
    const metrics = this.accuracyTracker.getAccuracyMetrics();
    const overallMetrics = {
      targetAccuracy: this.targetAccuracy,
      lastTrainingDate: this.lastTrainingDate,
      modelVersions: this.modelVersions,
      meetsTarget: {},
      recommendations: []
    };

    // Check if each model meets the 90% accuracy target
    Object.keys(metrics).forEach(modelType => {
      const currentAccuracy = metrics[modelType].currentAccuracy;
      overallMetrics.meetsTarget[modelType] = currentAccuracy >= this.targetAccuracy;
      
      if (currentAccuracy < this.targetAccuracy) {
        overallMetrics.recommendations.push({
          model: modelType,
          issue: `Accuracy ${(currentAccuracy * 100).toFixed(1)}% is below target ${(this.targetAccuracy * 100).toFixed(1)}%`,
          suggestion: 'Consider retraining with more data or adjusting hyperparameters'
        });
      }
    });

    return {
      ...metrics,
      ...overallMetrics
    };
  }

  async continuousLearning(newData) {
    // Implement continuous learning to improve accuracy over time
    try {
      const currentAccuracy = this.getModelAccuracy();
      const needsRetraining = Object.keys(currentAccuracy.meetsTarget)
        .some(model => !currentAccuracy.meetsTarget[model]);

      if (needsRetraining || this.shouldRetrain()) {
        console.log('Initiating continuous learning retraining...');
        const trainingResults = await this.trainModels(newData);
        this.lastTrainingDate = new Date();
        
        // Update model versions
        Object.keys(trainingResults).forEach(modelType => {
          this.modelVersions[modelType] = (this.modelVersions[modelType] || 0) + 1;
        });

        this.accuracyTracker.updateAccuracy(trainingResults);
        return trainingResults;
      }

      return null; // No retraining needed
    } catch (error) {
      console.error('Continuous learning error:', error);
      throw error;
    }
  }

  shouldRetrain() {
    // Check if models should be retrained based on time or performance degradation
    if (!this.lastTrainingDate) return true;
    
    const daysSinceLastTraining = (new Date() - this.lastTrainingDate) / (1000 * 60 * 60 * 24);
    const weeklyRetraining = daysSinceLastTraining >= 7; // Retrain weekly
    
    return weeklyRetraining;
  }

  normalizeEngagement(score) { return score / 100; }
  normalizeFrequency(frequency) { return Math.min(frequency / 30, 1); } // 30 per month max
  normalizeTime(days) { return Math.min(days / 30, 1); } // 30 days max
  normalizeRating(rating) { return rating / 5; }
  normalizeDifficulty(difficulty) { return difficulty / 10; }
  normalizeScore(score) { return score / 100; }
  normalizeMotivation(motivation) { return motivation / 10; }
}

class AccuracyTracker {
  constructor() {
    this.accuracyHistory = {
      completion: [],
      performance: [],
      dropout: [],
      engagement: []
    };
  }

  updateAccuracy(trainingResults) {
    Object.keys(trainingResults).forEach(modelType => {
      const result = trainingResults[modelType];
      this.accuracyHistory[modelType].push({
        timestamp: new Date(),
        accuracy: result.finalAccuracy,
        loss: result.finalLoss
      });
      
      // Keep only last 100 entries
      if (this.accuracyHistory[modelType].length > 100) {
        this.accuracyHistory[modelType].shift();
      }
    });
  }

  getAccuracyMetrics() {
    const metrics = {};
    
    Object.keys(this.accuracyHistory).forEach(modelType => {
      const history = this.accuracyHistory[modelType];
      if (history.length > 0) {
        const recent = history.slice(-10); // Last 10 entries
        metrics[modelType] = {
          currentAccuracy: recent[recent.length - 1].accuracy,
          averageAccuracy: ss.mean(recent.map(r => r.accuracy)),
          currentLoss: recent[recent.length - 1].loss,
          averageLoss: ss.mean(recent.map(r => r.loss)),
          trend: this.calculateTrend(recent),
          samples: history.length
        };
      }
    });
    
    return metrics;
  }

  calculateTrend(data) {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-5);
    const older = data.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = ss.mean(recent.map(r => r.accuracy));
    const olderAvg = ss.mean(older.map(r => r.accuracy));
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }
}

module.exports = LearningOutcomePredictionEngine;
