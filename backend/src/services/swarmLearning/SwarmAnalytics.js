const EventEmitter = require('events');
const logger = require('../../utils/logger');

class SwarmAnalytics extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      metricsRetentionPeriod: options.metricsRetentionPeriod || 24 * 60 * 60 * 1000, // 24 hours
      aggregationInterval: options.aggregationInterval || 60000, // 1 minute
      alertThresholds: {
        lowPerformance: options.lowPerformanceThreshold || 0.5,
        highLatency: options.highLatencyThreshold || 5000,
        lowConvergence: options.lowConvergenceThreshold || 0.3,
        networkFragmentation: options.networkFragmentationThreshold || 0.7
      },
      ...options
    };

    this.metricsHistory = new Map();
    this.realTimeMetrics = new Map();
    this.aggregatedMetrics = new Map();
    this.alerts = [];
    this.aggregationTimer = null;
  }

  async initialize() {
    this._startAggregation();
    logger.info('Swarm analytics initialized');
  }

  recordMetric(metricName, value, metadata = {}) {
    const timestamp = new Date().toISOString();
    const metric = {
      name: metricName,
      value,
      timestamp,
      metadata
    };

    // Store in real-time metrics
    if (!this.realTimeMetrics.has(metricName)) {
      this.realTimeMetrics.set(metricName, []);
    }
    
    this.realTimeMetrics.get(metricName).push(metric);
    
    // Keep only recent metrics
    this._cleanupOldMetrics(metricName);
    
    // Check for alerts
    this._checkAlerts(metricName, value);
    
    this.emit('metricRecorded', metric);
  }

  recordAgentMetrics(agentId, metrics) {
    const timestamp = new Date().toISOString();
    const agentMetrics = {
      agentId,
      ...metrics,
      timestamp
    };

    const metricKey = `agent_${agentId}`;
    if (!this.realTimeMetrics.has(metricKey)) {
      this.realTimeMetrics.set(metricKey, []);
    }
    
    this.realTimeMetrics.get(metricKey).push(agentMetrics);
    this._cleanupOldMetrics(metricKey);
    
    this.emit('agentMetricsRecorded', agentMetrics);
  }

  recordSystemMetrics(metrics) {
    const timestamp = new Date().toISOString();
    const systemMetrics = {
      ...metrics,
      timestamp
    };

    if (!this.realTimeMetrics.has('system')) {
      this.realTimeMetrics.set('system', []);
    }
    
    this.realTimeMetrics.get('system').push(systemMetrics);
    this._cleanupOldMetrics('system');
    
    this.emit('systemMetricsRecorded', systemMetrics);
  }

  _cleanupOldMetrics(metricName) {
    const metrics = this.realTimeMetrics.get(metricName);
    if (!metrics) return;
    
    const cutoff = Date.now() - this.config.metricsRetentionPeriod;
    const filtered = metrics.filter(metric => 
      new Date(metric.timestamp).getTime() > cutoff
    );
    
    this.realTimeMetrics.set(metricName, filtered);
  }

  _startAggregation() {
    this.aggregationTimer = setInterval(() => {
      this._aggregateMetrics();
    }, this.config.aggregationInterval);
  }

  _aggregateMetrics() {
    const timestamp = new Date().toISOString();
    
    for (const [metricName, metrics] of this.realTimeMetrics) {
      if (metrics.length === 0) continue;
      
      const aggregated = this._calculateAggregatedMetrics(metrics);
      
      if (!this.aggregatedMetrics.has(metricName)) {
        this.aggregatedMetrics.set(metricName, []);
      }
      
      this.aggregatedMetrics.get(metricName).push({
        ...aggregated,
        timestamp
      });
      
      // Keep only last 1000 aggregated points
      const history = this.aggregatedMetrics.get(metricName);
      if (history.length > 1000) {
        history.shift();
      }
    }
    
    this.emit('metricsAggregated', { timestamp });
  }

  _calculateAggregatedMetrics(metrics) {
    const values = metrics.map(m => m.value);
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      mean: values.reduce((sum, v) => sum + v, 0) / values.length,
      median: this._calculateMedian(values),
      stdDev: this._calculateStandardDeviation(values),
      trend: this._calculateTrend(values)
    };
  }

  _calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  _calculateStandardDeviation(values) {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  _calculateTrend(values) {
    if (values.length < 2) return 0;
    
    // Simple linear regression to calculate trend
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  _checkAlerts(metricName, value) {
    const thresholds = this.config.alertThresholds;
    
    switch (metricName) {
      case 'performance':
        if (value < thresholds.lowPerformance) {
          this._createAlert('low_performance', `Performance dropped to ${value}`, 'warning');
        }
        break;
        
      case 'latency':
        if (value > thresholds.highLatency) {
          this._createAlert('high_latency', `Latency increased to ${value}ms`, 'warning');
        }
        break;
        
      case 'convergence':
        if (value < thresholds.lowConvergence) {
          this._createAlert('low_convergence', `Convergence rate dropped to ${value}`, 'warning');
        }
        break;
        
      case 'network_fragmentation':
        if (value > thresholds.networkFragmentation) {
          this._createAlert('network_fragmentation', `Network fragmentation increased to ${value}`, 'critical');
        }
        break;
    }
  }

  _createAlert(type, message, severity) {
    const alert = {
      id: Date.now().toString(),
      type,
      message,
      severity,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }
    
    this.emit('alert', alert);
    logger.warn(`Alert: ${message}`);
  }

  getMetrics(metricName, timeRange = null) {
    const metrics = this.realTimeMetrics.get(metricName) || [];
    
    if (!timeRange) {
      return metrics;
    }
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    return metrics.filter(metric => 
      new Date(metric.timestamp).getTime() >= startTime
    );
  }

  getAggregatedMetrics(metricName, timeRange = null) {
    const metrics = this.aggregatedMetrics.get(metricName) || [];
    
    if (!timeRange) {
      return metrics;
    }
    
    const now = Date.now();
    const startTime = now - timeRange;
    
    return metrics.filter(metric => 
      new Date(metric.timestamp).getTime() >= startTime
    );
  }

  getSystemOverview() {
    const overview = {
      timestamp: new Date().toISOString(),
      agents: this._getAgentCount(),
      activeConnections: this._getActiveConnections(),
      performance: this._getCurrentPerformance(),
      convergence: this._getCurrentConvergence(),
      alerts: this.alerts.filter(a => !a.acknowledged).length,
      networkHealth: this._calculateNetworkHealth()
    };
    
    return overview;
  }

  _getAgentCount() {
    const agentMetrics = Array.from(this.realTimeMetrics.keys())
      .filter(key => key.startsWith('agent_'));
    return agentMetrics.length;
  }

  _getActiveConnections() {
    const systemMetrics = this.realTimeMetrics.get('system') || [];
    const latest = systemMetrics[systemMetrics.length - 1];
    return latest?.activeConnections || 0;
  }

  _getCurrentPerformance() {
    const performanceMetrics = this.getMetrics('performance');
    if (performanceMetrics.length === 0) return 0;
    
    return performanceMetrics[performanceMetrics.length - 1].value;
  }

  _getCurrentConvergence() {
    const convergenceMetrics = this.getMetrics('convergence');
    if (convergenceMetrics.length === 0) return 0;
    
    return convergenceMetrics[convergenceMetrics.length - 1].value;
  }

  _calculateNetworkHealth() {
    const performance = this._getCurrentPerformance();
    const convergence = this._getCurrentConvergence();
    const fragmentation = this._getCurrentNetworkFragmentation();
    
    // Calculate overall health score (0-1)
    let health = (performance + convergence) / 2;
    
    // Penalize for fragmentation
    if (fragmentation > 0.5) {
      health *= (1 - fragmentation);
    }
    
    return Math.max(0, Math.min(1, health));
  }

  _getCurrentNetworkFragmentation() {
    const fragmentationMetrics = this.getMetrics('network_fragmentation');
    if (fragmentationMetrics.length === 0) return 0;
    
    return fragmentationMetrics[fragmentationMetrics.length - 1].value;
  }

  getAgentPerformance(agentId, timeRange = null) {
    const metricKey = `agent_${agentId}`;
    const metrics = this.getMetrics(metricKey, timeRange);
    
    if (metrics.length === 0) return null;
    
    const latest = metrics[metrics.length - 1];
    
    return {
      agentId,
      performance: latest.performance || 0,
      reliability: latest.reliability || 0,
      contribution: latest.contribution || 0,
      load: latest.load || 0,
      lastUpdate: latest.timestamp
    };
  }

  getTopPerformers(limit = 10, metric = 'performance') {
    const agentMetrics = new Map();
    
    // Collect latest metrics for each agent
    for (const [key, metrics] of this.realTimeMetrics) {
      if (!key.startsWith('agent_')) continue;
      
      const agentId = key.replace('agent_', '');
      const latest = metrics[metrics.length - 1];
      
      if (latest && latest[metric] !== undefined) {
        agentMetrics.set(agentId, latest[metric]);
      }
    }
    
    // Sort by performance
    const sorted = Array.from(agentMetrics.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return sorted.map(([agentId, value]) => ({
      agentId,
      [metric]: value
    }));
  }

  getPerformanceTrends(timeRange = 3600000) { // 1 hour default
    const trends = {};
    
    for (const [metricName, aggregated] of this.aggregatedMetrics) {
      const recentMetrics = aggregated.filter(metric => 
        new Date(metric.timestamp).getTime() > Date.now() - timeRange
      );
      
      if (recentMetrics.length >= 2) {
        const latest = recentMetrics[recentMetrics.length - 1];
        const previous = recentMetrics[0];
        
        trends[metricName] = {
          current: latest.mean,
          previous: previous.mean,
          change: latest.mean - previous.mean,
          changePercent: ((latest.mean - previous.mean) / previous.mean) * 100,
          trend: latest.trend
        };
      }
    }
    
    return trends;
  }

  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  getAlerts(severity = null, acknowledged = null) {
    let filtered = this.alerts;
    
    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }
    
    if (acknowledged !== null) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged);
    }
    
    return filtered;
  }

  generateReport(timeRange = 3600000) { // 1 hour default
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange);
    
    const report = {
      period: {
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        duration: timeRange
      },
      summary: this.getSystemOverview(),
      metrics: {},
      agents: this._getAgentSummary(timeRange),
      alerts: this._getAlertSummary(timeRange),
      recommendations: this._generateRecommendations()
    };
    
    // Add metric summaries
    for (const [metricName] of this.aggregatedMetrics) {
      const metrics = this.getAggregatedMetrics(metricName, timeRange);
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        report.metrics[metricName] = {
          current: latest.mean,
          min: latest.min,
          max: latest.max,
          trend: latest.trend
        };
      }
    }
    
    return report;
  }

  _getAgentSummary(timeRange) {
    const agentSummary = {
      total: 0,
      active: 0,
      averagePerformance: 0,
      topPerformers: []
    };
    
    const agentMetrics = new Map();
    
    for (const [key, metrics] of this.realTimeMetrics) {
      if (!key.startsWith('agent_')) continue;
      
      const agentId = key.replace('agent_', '');
      const recentMetrics = metrics.filter(metric => 
        new Date(metric.timestamp).getTime() > Date.now() - timeRange
      );
      
      if (recentMetrics.length > 0) {
        const latest = recentMetrics[recentMetrics.length - 1];
        agentMetrics.set(agentId, latest.performance || 0);
      }
    }
    
    agentSummary.total = agentMetrics.size;
    agentSummary.active = agentMetrics.size;
    
    if (agentMetrics.size > 0) {
      const performances = Array.from(agentMetrics.values());
      agentSummary.averagePerformance = performances.reduce((a, b) => a + b, 0) / performances.length;
      
      agentSummary.topPerformers = Array.from(agentMetrics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([agentId, performance]) => ({ agentId, performance }));
    }
    
    return agentSummary;
  }

  _getAlertSummary(timeRange) {
    const recentAlerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > Date.now() - timeRange
    );
    
    return {
      total: recentAlerts.length,
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      warning: recentAlerts.filter(a => a.severity === 'warning').length,
      acknowledged: recentAlerts.filter(a => a.acknowledged).length
    };
  }

  _generateRecommendations() {
    const recommendations = [];
    const performance = this._getCurrentPerformance();
    const convergence = this._getCurrentConvergence();
    const networkHealth = this._calculateNetworkHealth();
    
    if (performance < 0.6) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider adding more agents or optimizing agent capabilities',
        action: 'scale_agents'
      });
    }
    
    if (convergence < 0.4) {
      recommendations.push({
        type: 'convergence',
        priority: 'medium',
        message: 'Adjust learning parameters or improve communication protocols',
        action: 'optimize_learning'
      });
    }
    
    if (networkHealth < 0.7) {
      recommendations.push({
        type: 'network',
        priority: 'high',
        message: 'Network health is degraded, check for fragmentation or connection issues',
        action: 'diagnose_network'
      });
    }
    
    const unacknowledgedAlerts = this.alerts.filter(a => !a.acknowledged);
    if (unacknowledgedAlerts.length > 5) {
      recommendations.push({
        type: 'alerts',
        priority: 'medium',
        message: 'Multiple unacknowledged alerts require attention',
        action: 'review_alerts'
      });
    }
    
    return recommendations;
  }

  exportMetrics(format = 'json', timeRange = null) {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: {},
      aggregatedMetrics: {}
    };
    
    for (const [metricName] of this.realTimeMetrics) {
      data.metrics[metricName] = this.getMetrics(metricName, timeRange);
    }
    
    for (const [metricName] of this.aggregatedMetrics) {
      data.aggregatedMetrics[metricName] = this.getAggregatedMetrics(metricName, timeRange);
    }
    
    if (format === 'csv') {
      return this._convertToCSV(data);
    }
    
    return JSON.stringify(data, null, 2);
  }

  _convertToCSV(data) {
    const csvLines = ['timestamp,metric_name,value,metadata'];
    
    for (const [metricName, metrics] of Object.entries(data.metrics)) {
      for (const metric of metrics) {
        const metadata = JSON.stringify(metric.metadata || {}).replace(/"/g, '""');
        csvLines.push(`${metric.timestamp},${metricName},${metric.value},"${metadata}"`);
      }
    }
    
    return csvLines.join('\n');
  }

  cleanup() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    
    this.metricsHistory.clear();
    this.realTimeMetrics.clear();
    this.aggregatedMetrics.clear();
    this.alerts = [];
    
    logger.info('Swarm analytics cleaned up');
  }
}

module.exports = SwarmAnalytics;
