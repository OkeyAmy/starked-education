/**
 * Optimization Analytics and Visualization System
 * Provides comprehensive analytics and visualization data for ACO optimization
 */

class OptimizationAnalytics {
  constructor() {
    this.metrics = new Map();
    this.performanceHistory = [];
    this.comparativeAnalysis = new Map();
    this.realTimeMetrics = new Map();
    this.alertThresholds = {
      efficiencyDrop: 0.3,
      convergenceTime: 1000,
      resourceUtilization: 0.8,
      userSatisfaction: 0.7
    };
  }

  /**
   * Record optimization metrics
   */
  recordMetrics(optimizationId, metrics) {
    const timestamp = Date.now();
    
    const record = {
      optimizationId,
      timestamp,
      ...metrics,
      id: this.generateMetricId()
    };
    
    this.metrics.set(record.id, record);
    this.performanceHistory.push(record);
    
    // Update real-time metrics
    this.updateRealTimeMetrics(optimizationId, metrics);
    
    // Check for alerts
    this.checkAlerts(record);
    
    return record.id;
  }

  /**
   * Generate unique metric ID
   */
  generateMetricId() {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update real-time metrics
   */
  updateRealTimeMetrics(optimizationId, metrics) {
    if (!this.realTimeMetrics.has(optimizationId)) {
      this.realTimeMetrics.set(optimizationId, {
        currentEfficiency: 0,
        averageEfficiency: 0,
        peakEfficiency: 0,
        convergenceRate: 0,
        resourceUtilization: 0,
        userSatisfaction: 0,
        totalOptimizations: 0,
        lastUpdate: Date.now()
      });
    }
    
    const realTime = this.realTimeMetrics.get(optimizationId);
    realTime.currentEfficiency = metrics.efficiency || 0;
    realTime.resourceUtilization = metrics.utilization || 0;
    realTime.userSatisfaction = metrics.satisfaction || 0;
    realTime.totalOptimizations += 1;
    realTime.lastUpdate = Date.now();
    
    // Update averages and peaks
    const optimizationMetrics = this.getOptimizationMetrics(optimizationId);
    if (optimizationMetrics.length > 0) {
      const efficiencies = optimizationMetrics.map(m => m.efficiency || 0);
      realTime.averageEfficiency = efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
      realTime.peakEfficiency = Math.max(...efficiencies);
    }
    
    // Calculate convergence rate
    realTime.convergenceRate = this.calculateConvergenceRate(optimizationId);
  }

  /**
   * Calculate convergence rate
   */
  calculateConvergenceRate(optimizationId) {
    const metrics = this.getOptimizationMetrics(optimizationId);
    if (metrics.length < 10) return 0;
    
    const recent = metrics.slice(-10);
    const improvements = recent.filter((m, i) => {
      if (i === 0) return false;
      return (m.efficiency || 0) > (recent[i-1].efficiency || 0);
    });
    
    return improvements.length / (recent.length - 1);
  }

  /**
   * Check for performance alerts
   */
  checkAlerts(metrics) {
    const alerts = [];
    
    // Efficiency drop alert
    if (metrics.efficiency < this.alertThresholds.efficiencyDrop) {
      alerts.push({
        type: 'efficiency_drop',
        severity: 'warning',
        message: `Efficiency dropped to ${metrics.efficiency.toFixed(3)}`,
        timestamp: Date.now(),
        optimizationId: metrics.optimizationId
      });
    }
    
    // Resource utilization alert
    if (metrics.utilization > this.alertThresholds.resourceUtilization) {
      alerts.push({
        type: 'high_utilization',
        severity: 'info',
        message: `Resource utilization at ${(metrics.utilization * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        optimizationId: metrics.optimizationId
      });
    }
    
    // User satisfaction alert
    if (metrics.satisfaction < this.alertThresholds.userSatisfaction) {
      alerts.push({
        type: 'low_satisfaction',
        severity: 'warning',
        message: `User satisfaction at ${(metrics.satisfaction * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        optimizationId: metrics.optimizationId
      });
    }
    
    // Convergence time alert
    if (metrics.iterations > this.alertThresholds.convergenceTime) {
      alerts.push({
        type: 'slow_convergence',
        severity: 'error',
        message: `Slow convergence: ${metrics.iterations} iterations`,
        timestamp: Date.now(),
        optimizationId: metrics.optimizationId
      });
    }
    
    if (alerts.length > 0) {
      this.emitAlerts(alerts);
    }
  }

  /**
   * Emit alerts (in a real system, this would send notifications)
   */
  emitAlerts(alerts) {
    console.log('Optimization Alerts:', alerts);
    // In a real implementation, this would integrate with notification systems
  }

  /**
   * Get metrics for a specific optimization
   */
  getOptimizationMetrics(optimizationId) {
    return Array.from(this.metrics.values()).filter(m => m.optimizationId === optimizationId);
  }

  /**
   * Get performance visualization data
   */
  getPerformanceVisualization(optimizationId, timeRange = null) {
    const metrics = this.getOptimizationMetrics(optimizationId);
    
    let filteredMetrics = metrics;
    if (timeRange) {
      const now = Date.now();
      filteredMetrics = metrics.filter(m => 
        m.timestamp >= now - timeRange
      );
    }
    
    // Prepare data for charts
    const timelineData = filteredMetrics.map(m => ({
      timestamp: m.timestamp,
      efficiency: m.efficiency || 0,
      utilization: m.utilization || 0,
      satisfaction: m.satisfaction || 0,
      iterations: m.iterations || 0,
      cost: m.cost || 0
    })).sort((a, b) => a.timestamp - b.timestamp);
    
    // Calculate trend lines
    const efficiencyTrend = this.calculateTrend(timelineData.map(d => d.efficiency));
    const utilizationTrend = this.calculateTrend(timelineData.map(d => d.utilization));
    
    return {
      timeline: timelineData,
      trends: {
        efficiency: efficiencyTrend,
        utilization: utilizationTrend
      },
      summary: this.calculateSummaryStats(timelineData),
      realTime: this.realTimeMetrics.get(optimizationId) || null
    };
  }

  /**
   * Calculate trend line data
   */
  calculateTrend(values) {
    if (values.length < 2) return { slope: 0, intercept: 0, direction: 'stable' };
    
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    let direction = 'stable';
    if (Math.abs(slope) > 0.01) {
      direction = slope > 0 ? 'improving' : 'declining';
    }
    
    return { slope, intercept, direction };
  }

  /**
   * Calculate summary statistics
   */
  calculateSummaryStats(data) {
    if (data.length === 0) return null;
    
    const efficiencies = data.map(d => d.efficiency);
    const utilizations = data.map(d => d.utilization);
    const satisfactions = data.map(d => d.satisfaction);
    
    return {
      efficiency: {
        min: Math.min(...efficiencies),
        max: Math.max(...efficiencies),
        avg: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
        current: efficiencies[efficiencies.length - 1] || 0
      },
      utilization: {
        min: Math.min(...utilizations),
        max: Math.max(...utilizations),
        avg: utilizations.reduce((a, b) => a + b, 0) / utilizations.length,
        current: utilizations[utilizations.length - 1] || 0
      },
      satisfaction: {
        min: Math.min(...satisfactions),
        max: Math.max(...satisfactions),
        avg: satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length,
        current: satisfactions[satisfactions.length - 1] || 0
      },
      totalDataPoints: data.length
    };
  }

  /**
   * Generate comparative analysis between optimizations
   */
  generateComparativeAnalysis(optimizationIds) {
    const comparison = {
      optimizations: {},
      rankings: {},
      insights: []
    };
    
    // Collect data for each optimization
    for (const id of optimizationIds) {
      const metrics = this.getOptimizationMetrics(id);
      const realTime = this.realTimeMetrics.get(id);
      
      if (metrics.length > 0) {
        comparison.optimizations[id] = {
          totalOptimizations: metrics.length,
          averageEfficiency: realTime?.averageEfficiency || 0,
          peakEfficiency: realTime?.peakEfficiency || 0,
          convergenceRate: realTime?.convergenceRate || 0,
          resourceUtilization: realTime?.resourceUtilization || 0,
          userSatisfaction: realTime?.userSatisfaction || 0
        };
      }
    }
    
    // Generate rankings
    const rankings = this.generateRankings(comparison.optimizations);
    comparison.rankings = rankings;
    
    // Generate insights
    comparison.insights = this.generateInsights(comparison.optimizations);
    
    // Store for future reference
    const analysisId = this.generateAnalysisId();
    this.comparativeAnalysis.set(analysisId, comparison);
    
    return { analysisId, ...comparison };
  }

  /**
   * Generate analysis ID
   */
  generateAnalysisId() {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate rankings for optimizations
   */
  generateRankings(optimizations) {
    const rankings = {};
    
    const metrics = ['averageEfficiency', 'peakEfficiency', 'convergenceRate', 'resourceUtilization', 'userSatisfaction'];
    
    for (const metric of metrics) {
      const sorted = Object.entries(optimizations)
        .sort(([, a], [, b]) => b[metric] - a[metric])
        .map(([id], index) => ({ id, rank: index + 1 }));
      
      rankings[metric] = sorted;
    }
    
    // Overall ranking (average of all metric ranks)
    const overallRankings = Object.keys(optimizations).map(id => {
      const avgRank = metrics.reduce((sum, metric) => {
        const rank = rankings[metric].find(r => r.id === id)?.rank || Object.keys(optimizations).length;
        return sum + rank;
      }, 0) / metrics.length;
      
      return { id, rank: avgRank };
    }).sort((a, b) => a.rank - b.rank);
    
    rankings.overall = overallRankings;
    
    return rankings;
  }

  /**
   * Generate insights from comparative analysis
   */
  generateInsights(optimizations) {
    const insights = [];
    const optIds = Object.keys(optimizations);
    
    if (optIds.length < 2) return insights;
    
    // Find best and worst performers
    const efficiencyRanking = Object.entries(optimizations)
      .sort(([, a], [, b]) => b.averageEfficiency - a.averageEfficiency);
    
    const best = efficiencyRanking[0];
    const worst = efficiencyRanking[efficiencyRanking.length - 1];
    
    insights.push({
      type: 'performance_comparison',
      title: 'Performance Leaders',
      description: `Optimization ${best[0]} leads with ${(best[1].averageEfficiency * 100).toFixed(1)}% efficiency, while ${worst[0]} has ${(worst[1].averageEfficiency * 100).toFixed(1)}%`,
      severity: best[1].averageEfficiency > 0.8 ? 'success' : 'info'
    });
    
    // Convergence analysis
    const convergenceRates = Object.values(optimizations).map(opt => opt.convergenceRate);
    const avgConvergence = convergenceRates.reduce((a, b) => a + b, 0) / convergenceRates.length;
    
    if (avgConvergence < 0.3) {
      insights.push({
        type: 'convergence_issue',
        title: 'Slow Convergence Detected',
        description: `Average convergence rate is ${(avgConvergence * 100).toFixed(1)}%, consider tuning ACO parameters`,
        severity: 'warning'
      });
    }
    
    // Resource utilization insights
    const utilizationRates = Object.values(optimizations).map(opt => opt.resourceUtilization);
    const avgUtilization = utilizationRates.reduce((a, b) => a + b, 0) / utilizationRates.length;
    
    if (avgUtilization > 0.9) {
      insights.push({
        type: 'resource_pressure',
        title: 'High Resource Utilization',
        description: `Average utilization is ${(avgUtilization * 100).toFixed(1)}%, consider scaling resources`,
        severity: 'warning'
      });
    }
    
    return insights;
  }

  /**
   * Get dashboard data for visualization
   */
  getDashboardData() {
    const dashboard = {
      summary: this.getSystemSummary(),
      realTimeMetrics: Object.fromEntries(this.realTimeMetrics),
      recentAlerts: this.getRecentAlerts(),
      performanceTrends: this.getPerformanceTrends(),
      topOptimizations: this.getTopOptimizations()
    };
    
    return dashboard;
  }

  /**
   * Get system summary
   */
  getSystemSummary() {
    const totalOptimizations = this.metrics.size;
    const activeOptimizations = this.realTimeMetrics.size;
    
    let totalEfficiency = 0;
    let totalUtilization = 0;
    let totalSatisfaction = 0;
    
    for (const realTime of this.realTimeMetrics.values()) {
      totalEfficiency += realTime.averageEfficiency;
      totalUtilization += realTime.resourceUtilization;
      totalSatisfaction += realTime.userSatisfaction;
    }
    
    const count = activeOptimizations || 1;
    
    return {
      totalOptimizations,
      activeOptimizations,
      averageEfficiency: totalEfficiency / count,
      averageUtilization: totalUtilization / count,
      averageSatisfaction: totalSatisfaction / count,
      lastUpdate: Date.now()
    };
  }

  /**
   * Get recent alerts (placeholder - would need alert storage)
   */
  getRecentAlerts() {
    // In a real implementation, this would query stored alerts
    return [];
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends() {
    const trends = {};
    
    for (const [optimizationId] of this.realTimeMetrics) {
      const viz = this.getPerformanceVisualization(optimizationId, 24 * 60 * 60 * 1000); // Last 24 hours
      trends[optimizationId] = viz.trends;
    }
    
    return trends;
  }

  /**
   * Get top performing optimizations
   */
  getTopOptimizations(limit = 5) {
    const rankings = [];
    
    for (const [optimizationId, realTime] of this.realTimeMetrics) {
      rankings.push({
        optimizationId,
        score: (realTime.averageEfficiency * 0.4 + 
                realTime.resourceUtilization * 0.3 + 
                realTime.userSatisfaction * 0.3),
        efficiency: realTime.averageEfficiency,
        utilization: realTime.resourceUtilization,
        satisfaction: realTime.userSatisfaction
      });
    }
    
    return rankings
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const data = {
      metrics: Array.from(this.metrics.values()),
      performanceHistory: this.performanceHistory,
      comparativeAnalysis: Array.from(this.comparativeAnalysis.entries()),
      realTimeMetrics: Object.fromEntries(this.realTimeMetrics),
      exportTimestamp: Date.now()
    };
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data.metrics);
      default:
        return data;
    }
  }

  /**
   * Convert metrics to CSV format
   */
  convertToCSV(metrics) {
    if (metrics.length === 0) return '';
    
    const headers = Object.keys(metrics[0]);
    const csvRows = [headers.join(',')];
    
    for (const metric of metrics) {
      const values = headers.map(header => {
        const value = metric[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Clear old data
   */
  clearOldData(olderThan = 7 * 24 * 60 * 60 * 1000) { // Default: 7 days
    const cutoff = Date.now() - olderThan;
    
    // Clear old metrics
    for (const [id, metric] of this.metrics) {
      if (metric.timestamp < cutoff) {
        this.metrics.delete(id);
      }
    }
    
    // Clear old performance history
    this.performanceHistory = this.performanceHistory.filter(m => m.timestamp >= cutoff);
    
    // Clear old comparative analysis
    for (const [id, analysis] of this.comparativeAnalysis) {
      // Assuming analysis has a timestamp, adjust as needed
      if (analysis.timestamp && analysis.timestamp < cutoff) {
        this.comparativeAnalysis.delete(id);
      }
    }
  }

  /**
   * Set alert thresholds
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }
}

module.exports = OptimizationAnalytics;
