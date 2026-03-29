const EventEmitter = require('events');
const logger = require('../../utils/logger');

class AnalyticsDashboard extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      retentionDays: options.retentionDays || 30,
      aggregationInterval: options.aggregationInterval || 60000, // 1 minute
      enableRealTime: options.enableRealTime || true,
      ...options
    };

    this.metrics = {
      participants: new Map(),
      rounds: new Map(),
      models: new Map(),
      performance: new Map(),
      privacy: new Map(),
      fairness: new Map()
    };

    this.realTimeData = {
      activeParticipants: 0,
      currentRound: null,
      globalAccuracy: 0,
      privacyBudgetUsed: 0,
      averageFairness: 0,
      systemHealth: 'healthy'
    };

    this.historicalData = [];
    this.alerts = [];
    this.aggregationTimer = null;

    if (this.config.enableRealTime) {
      this._startRealTimeAggregation();
    }
  }

  /**
   * Initialize analytics dashboard
   */
  async initialize() {
    logger.info('Federated Learning Analytics Dashboard initialized');
    this.emit('dashboardInitialized');
  }

  /**
   * Record participant metrics
   */
  recordParticipantMetrics(participantId, metrics) {
    const timestamp = new Date().toISOString();
    
    const participantMetrics = {
      participantId,
      timestamp,
      institutionId: metrics.institutionId,
      dataInfo: metrics.dataInfo,
      reputation: metrics.reputation,
      contributionCount: metrics.contributionCount || 0,
      averageAccuracy: metrics.averageAccuracy || 0,
      fairnessScore: metrics.fairnessScore || 0,
      privacyCompliance: metrics.privacyCompliance || true,
      lastActive: metrics.lastActive || timestamp,
      status: metrics.status || 'active'
    };

    this.metrics.participants.set(participantId, participantMetrics);
    this._updateRealTimeMetrics();
    
    this.emit('participantMetricsUpdated', participantMetrics);
    logger.debug(`Recorded metrics for participant ${participantId}`);
  }

  /**
   * Record round metrics
   */
  recordRoundMetrics(roundId, metrics) {
    const timestamp = new Date().toISOString();
    
    const roundMetrics = {
      roundId,
      timestamp,
      roundNumber: metrics.roundNumber,
      participantCount: metrics.participantCount,
      duration: metrics.duration,
      accuracy: metrics.accuracy,
      loss: metrics.loss,
      privacySpent: metrics.privacySpent,
      aggregationMethod: metrics.aggregationMethod,
      status: metrics.status,
      participantContributions: metrics.participantContributions || []
    };

    this.metrics.rounds.set(roundId, roundMetrics);
    this._updateRealTimeMetrics();
    
    this.emit('roundMetricsUpdated', roundMetrics);
    logger.debug(`Recorded metrics for round ${roundId}`);
  }

  /**
   * Record model performance metrics
   */
  recordModelMetrics(modelId, metrics) {
    const timestamp = new Date().toISOString();
    
    const modelMetrics = {
      modelId,
      timestamp,
      version: metrics.version,
      accuracy: metrics.accuracy,
      precision: metrics.precision,
      recall: metrics.recall,
      f1Score: metrics.f1Score,
      loss: metrics.loss,
      inferenceTime: metrics.inferenceTime,
      modelSize: metrics.modelSize,
      fairnessScore: metrics.fairnessScore,
      biasMetrics: metrics.biasMetrics || {}
    };

    this.metrics.models.set(modelId, modelMetrics);
    this._updateRealTimeMetrics();
    
    this.emit('modelMetricsUpdated', modelMetrics);
    logger.debug(`Recorded metrics for model ${modelId}`);
  }

  /**
   * Record privacy metrics
   */
  recordPrivacyMetrics(sessionId, metrics) {
    const timestamp = new Date().toISOString();
    
    const privacyMetrics = {
      sessionId,
      timestamp,
      totalBudget: metrics.totalBudget,
      spentBudget: metrics.spentBudget,
      remainingBudget: metrics.remainingBudget,
      epsilonUsed: metrics.epsilonUsed,
      deltaUsed: metrics.deltaUsed,
      mechanismUsage: metrics.mechanismUsage || {},
      complianceStatus: metrics.complianceStatus || 'compliant',
      dataLeakageRisk: metrics.dataLeakageRisk || 'low'
    };

    this.metrics.privacy.set(sessionId, privacyMetrics);
    this._updateRealTimeMetrics();
    
    this.emit('privacyMetricsUpdated', privacyMetrics);
    logger.debug(`Recorded privacy metrics for session ${sessionId}`);
  }

  /**
   * Get comprehensive dashboard data
   */
  getDashboardData() {
    return {
      realTime: this.realTimeData,
      summary: this._generateSummaryStats(),
      participants: this._getParticipantsSummary(),
      rounds: this._getRoundsSummary(),
      models: this._getModelsSummary(),
      privacy: this._getPrivacySummary(),
      fairness: this._getFairnessSummary(),
      alerts: this.alerts.slice(-10), // Last 10 alerts
      trends: this._generateTrends()
    };
  }

  /**
   * Generate summary statistics
   */
  _generateSummaryStats() {
    const participants = Array.from(this.metrics.participants.values());
    const rounds = Array.from(this.metrics.rounds.values());
    const models = Array.from(this.metrics.models.values());

    return {
      totalParticipants: participants.length,
      activeParticipants: participants.filter(p => p.status === 'active').length,
      totalRounds: rounds.length,
      completedRounds: rounds.filter(r => r.status === 'completed').length,
      averageAccuracy: this._calculateAverage(models.map(m => m.accuracy)),
      averageFairness: this._calculateAverage(participants.map(p => p.fairnessScore)),
      totalPrivacyBudgetUsed: this._calculateTotalPrivacyBudget(),
      systemUptime: this._calculateUptime(),
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get participants summary
   */
  _getParticipantsSummary() {
    const participants = Array.from(this.metrics.participants.values());
    
    return {
      total: participants.length,
      active: participants.filter(p => p.status === 'active').length,
      byInstitution: this._groupByInstitution(participants),
      reputationDistribution: this._calculateReputationDistribution(participants),
      topContributors: participants
        .sort((a, b) => b.contributionCount - a.contributionCount)
        .slice(0, 10)
        .map(p => ({
          participantId: p.participantId,
          institutionId: p.institutionId,
          contributionCount: p.contributionCount,
          averageAccuracy: p.averageAccuracy,
          fairnessScore: p.fairnessScore
        }))
    };
  }

  /**
   * Get rounds summary
   */
  _getRoundsSummary() {
    const rounds = Array.from(this.metrics.rounds.values());
    
    return {
      total: rounds.length,
      completed: rounds.filter(r => r.status === 'completed').length,
      averageDuration: this._calculateAverage(rounds.map(r => r.duration)),
      averageAccuracy: this._calculateAverage(rounds.map(r => r.accuracy)),
      accuracyTrend: this._calculateAccuracyTrend(rounds),
      participationTrend: this._calculateParticipationTrend(rounds),
      recentRounds: rounds
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10)
    };
  }

  /**
   * Get models summary
   */
  _getModelsSummary() {
    const models = Array.from(this.metrics.models.values());
    
    return {
      total: models.length,
      averageAccuracy: this._calculateAverage(models.map(m => m.accuracy)),
      averageModelSize: this._calculateAverage(models.map(m => m.modelSize)),
      averageInferenceTime: this._calculateAverage(models.map(m => m.inferenceTime)),
      accuracyProgression: models
        .sort((a, b) => a.version - b.version)
        .map(m => ({ version: m.version, accuracy: m.accuracy })),
      bestModel: models.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best, models[0] || {})
    };
  }

  /**
   * Get privacy summary
   */
  _getPrivacySummary() {
    const privacyMetrics = Array.from(this.metrics.privacy.values());
    
    return {
      totalBudget: this._calculateTotal(privacyMetrics.map(p => p.totalBudget)),
      spentBudget: this._calculateTotal(privacyMetrics.map(p => p.spentBudget)),
      remainingBudget: this._calculateTotal(privacyMetrics.map(p => p.remainingBudget)),
      complianceRate: this._calculateComplianceRate(privacyMetrics),
      mechanismUsage: this._aggregateMechanismUsage(privacyMetrics),
      riskAssessment: this._assessPrivacyRisk(privacyMetrics)
    };
  }

  /**
   * Get fairness summary
   */
  _getFairnessSummary() {
    const participants = Array.from(this.metrics.participants.values());
    const models = Array.from(this.metrics.models.values());
    
    return {
      averageParticipantFairness: this._calculateAverage(participants.map(p => p.fairnessScore)),
      averageModelFairness: this._calculateAverage(models.map(m => m.fairnessScore)),
      fairnessDistribution: this._calculateFairnessDistribution(participants),
      biasMetrics: this._aggregateBiasMetrics(models),
      fairnessTrend: this._calculateFairnessTrend(models)
    };
  }

  /**
   * Generate trends data
   */
  _generateTrends() {
    const rounds = Array.from(this.metrics.rounds.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    return {
      accuracyOverTime: rounds.map(r => ({
        timestamp: r.timestamp,
        roundNumber: r.roundNumber,
        accuracy: r.accuracy
      })),
      participationOverTime: rounds.map(r => ({
        timestamp: r.timestamp,
        roundNumber: r.roundNumber,
        participants: r.participantCount
      })),
      privacyBudgetOverTime: rounds.map(r => ({
        timestamp: r.timestamp,
        roundNumber: r.roundNumber,
        privacySpent: r.privacySpent
      }))
    };
  }

  /**
   * Update real-time metrics
   */
  _updateRealTimeMetrics() {
    const participants = Array.from(this.metrics.participants.values());
    const rounds = Array.from(this.metrics.rounds.values());
    const models = Array.from(this.metrics.models.values());
    const privacy = Array.from(this.metrics.privacy.values());

    this.realTimeData = {
      activeParticipants: participants.filter(p => p.status === 'active').length,
      currentRound: rounds.length > 0 ? rounds[rounds.length - 1] : null,
      globalAccuracy: models.length > 0 ? 
        models[models.length - 1].accuracy : 0,
      privacyBudgetUsed: this._calculateTotal(privacy.map(p => p.spentBudget)),
      averageFairness: this._calculateAverage(participants.map(p => p.fairnessScore)),
      systemHealth: this._assessSystemHealth()
    };

    this.emit('realTimeMetricsUpdated', this.realTimeData);
  }

  /**
   * Start real-time aggregation
   */
  _startRealTimeAggregation() {
    this.aggregationTimer = setInterval(() => {
      this._updateRealTimeMetrics();
      this._checkAlerts();
      this._cleanupOldData();
    }, this.config.aggregationInterval);
  }

  /**
   * Check for alerts
   */
  _checkAlerts() {
    const alerts = [];

    // Check accuracy drop
    if (this.realTimeData.globalAccuracy < 0.6) {
      alerts.push({
        type: 'accuracy',
        severity: 'warning',
        message: `Global accuracy dropped to ${this.realTimeData.globalAccuracy}`,
        timestamp: new Date().toISOString()
      });
    }

    // Check privacy budget
    const privacyUtilization = this.realTimeData.privacyBudgetUsed / 
      (this._calculateTotal(Array.from(this.metrics.privacy.values()).map(p => p.totalBudget)) || 1);
    
    if (privacyUtilization > 0.9) {
      alerts.push({
        type: 'privacy',
        severity: 'critical',
        message: `Privacy budget ${Math.round(privacyUtilization * 100)}% utilized`,
        timestamp: new Date().toISOString()
      });
    }

    // Check participant drop
    if (this.realTimeData.activeParticipants < 3) {
      alerts.push({
        type: 'participation',
        severity: 'warning',
        message: `Only ${this.realTimeData.activeParticipants} active participants`,
        timestamp: new Date().toISOString()
      });
    }

    // Add new alerts
    if (alerts.length > 0) {
      this.alerts.push(...alerts);
      this.emit('alertsGenerated', alerts);
    }
  }

  /**
   * Clean up old data
   */
  _cleanupOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    // Clean up old metrics
    for (const [key, metrics] of this.metrics.participants.entries()) {
      if (new Date(metrics.timestamp) < cutoffDate) {
        this.metrics.participants.delete(key);
      }
    }

    // Keep only recent alerts
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp) > cutoffDate
    );
  }

  /**
   * Helper methods
   */
  _calculateAverage(values) {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    return validValues.length > 0 ? 
      validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0;
  }

  _calculateTotal(values) {
    return values.reduce((sum, v) => sum + (v || 0), 0);
  }

  _groupByInstitution(participants) {
    const grouped = {};
    for (const participant of participants) {
      const institution = participant.institutionId;
      grouped[institution] = (grouped[institution] || 0) + 1;
    }
    return grouped;
  }

  _calculateReputationDistribution(participants) {
    const distribution = { low: 0, medium: 0, high: 0 };
    for (const participant of participants) {
      if (participant.reputation < 0.3) distribution.low++;
      else if (participant.reputation < 0.7) distribution.medium++;
      else distribution.high++;
    }
    return distribution;
  }

  _calculateAccuracyTrend(rounds) {
    if (rounds.length < 2) return 'insufficient_data';
    
    const recent = rounds.slice(-5);
    const older = rounds.slice(-10, -5);
    
    const recentAvg = this._calculateAverage(recent.map(r => r.accuracy));
    const olderAvg = this._calculateAverage(older.map(r => r.accuracy));
    
    if (recentAvg > olderAvg + 0.05) return 'improving';
    if (recentAvg < olderAvg - 0.05) return 'declining';
    return 'stable';
  }

  _calculateParticipationTrend(rounds) {
    if (rounds.length < 2) return 'insufficient_data';
    
    const recent = rounds.slice(-5);
    const older = rounds.slice(-10, -5);
    
    const recentAvg = this._calculateAverage(recent.map(r => r.participantCount));
    const olderAvg = this._calculateAverage(older.map(r => r.participantCount));
    
    if (recentAvg > olderAvg + 2) return 'increasing';
    if (recentAvg < olderAvg - 2) return 'decreasing';
    return 'stable';
  }

  _calculateTotalPrivacyBudget() {
    return this._calculateTotal(Array.from(this.metrics.privacy.values()).map(p => p.totalBudget));
  }

  _calculateUptime() {
    // Simplified uptime calculation
    return process.uptime();
  }

  _calculateComplianceRate(privacyMetrics) {
    if (privacyMetrics.length === 0) return 1.0;
    const compliant = privacyMetrics.filter(p => p.complianceStatus === 'compliant').length;
    return compliant / privacyMetrics.length;
  }

  _aggregateMechanismUsage(privacyMetrics) {
    const usage = {};
    for (const metrics of privacyMetrics) {
      for (const [mechanism, count] of Object.entries(metrics.mechanismUsage || {})) {
        usage[mechanism] = (usage[mechanism] || 0) + count;
      }
    }
    return usage;
  }

  _assessPrivacyRisk(privacyMetrics) {
    const avgUtilization = this._calculateAverage(
      privacyMetrics.map(p => p.spentBudget / (p.totalBudget || 1))
    );
    
    if (avgUtilization > 0.9) return 'high';
    if (avgUtilization > 0.7) return 'medium';
    return 'low';
  }

  _calculateFairnessDistribution(participants) {
    const distribution = { low: 0, medium: 0, high: 0 };
    for (const participant of participants) {
      if (participant.fairnessScore < 0.6) distribution.low++;
      else if (participant.fairnessScore < 0.8) distribution.medium++;
      else distribution.high++;
    }
    return distribution;
  }

  _aggregateBiasMetrics(models) {
    // Simplified bias aggregation
    return {
      averageBias: this._calculateAverage(
        models.map(m => m.biasMetrics.overallBias || 0)
      ),
      biasCategories: ['gender', 'race', 'age'] // Placeholder
    };
  }

  _calculateFairnessTrend(models) {
    if (models.length < 2) return 'insufficient_data';
    
    const recent = models.slice(-5);
    const older = models.slice(-10, -5);
    
    const recentAvg = this._calculateAverage(recent.map(m => m.fairnessScore));
    const olderAvg = this._calculateAverage(older.map(m => m.fairnessScore));
    
    if (recentAvg > olderAvg + 0.05) return 'improving';
    if (recentAvg < olderAvg - 0.05) return 'declining';
    return 'stable';
  }

  _assessSystemHealth() {
    let healthScore = 100;
    
    // Penalize low accuracy
    if (this.realTimeData.globalAccuracy < 0.6) healthScore -= 20;
    
    // Penalize low participation
    if (this.realTimeData.activeParticipants < 3) healthScore -= 30;
    
    // Penalize high privacy utilization
    const privacyUtilization = this.realTimeData.privacyBudgetUsed / 
      (this._calculateTotalPrivacyBudget() || 1);
    if (privacyUtilization > 0.9) healthScore -= 25;
    
    if (healthScore >= 80) return 'healthy';
    if (healthScore >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const data = this.getDashboardData();
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this._convertToCSV(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  _convertToCSV(data) {
    // Simplified CSV conversion
    const headers = ['timestamp', 'metric', 'value'];
    const rows = [headers.join(',')];
    
    // Add real-time metrics
    rows.push(`${new Date().toISOString()},activeParticipants,${data.realTime.activeParticipants}`);
    rows.push(`${new Date().toISOString()},globalAccuracy,${data.realTime.globalAccuracy}`);
    
    return rows.join('\n');
  }

  /**
   * Stop analytics dashboard
   */
  stop() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
    
    logger.info('Federated Learning Analytics Dashboard stopped');
    this.emit('dashboardStopped');
  }
}

module.exports = AnalyticsDashboard;
