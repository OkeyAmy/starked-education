const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Performance Monitor for Swarm Learning System
 * 
 * This module provides real-time performance monitoring and optimization
 * for the swarm learning architecture, ensuring scalability and efficiency.
 */
class PerformanceMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      monitoringInterval: options.monitoringInterval || 5000, // 5 seconds
      optimizationThreshold: options.optimizationThreshold || 0.8,
      maxMemoryUsage: options.maxMemoryUsage || 0.8, // 80% of available memory
      maxCpuUsage: options.maxCpuUsage || 0.8, // 80% CPU usage
      networkLatencyThreshold: options.networkLatencyThreshold || 1000, // 1 second
      ...options
    };

    this.metrics = {
      cpu: [],
      memory: [],
      networkLatency: [],
      agentPerformance: new Map(),
      swarmEfficiency: [],
      convergenceRate: []
    };

    this.performanceHistory = [];
    this.optimizationSuggestions = [];
    this.monitoringTimer = null;
    this.isMonitoring = false;
  }

  /**
   * Start performance monitoring
   */
  async start() {
    if (this.isMonitoring) {
      logger.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this._startMonitoring();
    logger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  async stop() {
    if (!this.isMonitoring) {
      logger.warn('Performance monitoring not started');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    logger.info('Performance monitoring stopped');
  }

  /**
   * Start monitoring loop
   */
  _startMonitoring() {
    this.monitoringTimer = setInterval(() => {
      this._collectMetrics();
      this._analyzePerformance();
      this._generateOptimizations();
    }, this.config.monitoringInterval);
  }

  /**
   * Collect system and swarm metrics
   */
  _collectMetrics() {
    const timestamp = Date.now();

    // Collect system metrics
    const systemMetrics = this._collectSystemMetrics();
    this.metrics.cpu.push({ timestamp, value: systemMetrics.cpu });
    this.metrics.memory.push({ timestamp, value: systemMetrics.memory });

    // Keep only recent metrics (last 100 data points)
    this._trimMetrics();

    // Emit metrics for external consumers
    this.emit('metrics', {
      timestamp,
      cpu: systemMetrics.cpu,
      memory: systemMetrics.memory,
      agentCount: this.metrics.agentPerformance.size
    });
  }

  /**
   * Collect system-level metrics
   */
  _collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    
    return {
      cpu: this._getCpuUsage(),
      memory: {
        used: memUsage.heapUsed / memUsage.heapTotal,
        system: (totalMemory - freeMemory) / totalMemory,
        heap: memUsage.heapUsed / 1024 / 1024, // MB
        total: memUsage.heapTotal / 1024 / 1024 // MB
      }
    };
  }

  /**
   * Get CPU usage (simplified)
   */
  _getCpuUsage() {
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 1 - (totalIdle / totalTick);
  }

  /**
   * Trim old metrics to prevent memory leaks
   */
  _trimMetrics() {
    const maxDataPoints = 100;

    Object.keys(this.metrics).forEach(key => {
      if (Array.isArray(this.metrics[key])) {
        if (this.metrics[key].length > maxDataPoints) {
          this.metrics[key] = this.metrics[key].slice(-maxDataPoints);
        }
      }
    });
  }

  /**
   * Analyze performance and detect issues
   */
  _analyzePerformance() {
    const currentCpu = this.metrics.cpu[this.metrics.cpu.length - 1]?.value || 0;
    const currentMemory = this.metrics.memory[this.metrics.memory.length - 1]?.value?.system || 0;

    // Check for performance issues
    if (currentCpu > this.config.maxCpuUsage) {
      this.emit('performanceIssue', {
        type: 'high_cpu',
        value: currentCpu,
        threshold: this.config.maxCpuUsage,
        suggestion: 'Consider reducing agent count or optimizing algorithms'
      });
    }

    if (currentMemory > this.config.maxMemoryUsage) {
      this.emit('performanceIssue', {
        type: 'high_memory',
        value: currentMemory,
        threshold: this.config.maxMemoryUsage,
        suggestion: 'Consider implementing memory cleanup or reducing data retention'
      });
    }

    // Analyze trends
    this._analyzeTrends();
  }

  /**
   * Analyze performance trends
   */
  _analyzeTrends() {
    if (this.metrics.cpu.length < 10) return; // Need enough data points

    const recentCpu = this.metrics.cpu.slice(-10);
    const cpuTrend = this._calculateTrend(recentCpu.map(m => m.value));

    if (cpuTrend > 0.1) { // Increasing CPU usage
      this.emit('trendAlert', {
        type: 'cpu_increasing',
        trend: cpuTrend,
        suggestion: 'Monitor for potential performance degradation'
      });
    }

    const recentMemory = this.metrics.memory.slice(-10);
    const memoryTrend = this._calculateTrend(recentMemory.map(m => m.value?.system || 0));

    if (memoryTrend > 0.1) { // Increasing memory usage
      this.emit('trendAlert', {
        type: 'memory_increasing',
        trend: memoryTrend,
        suggestion: 'Monitor for potential memory leaks'
      });
    }
  }

  /**
   * Calculate trend from data points
   */
  _calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return 0;

    const n = dataPoints.length;
    const sumX = (n * (n - 1)) / 2; // Sum of indices
    const sumY = dataPoints.reduce((sum, val) => sum + val, 0);
    const sumXY = dataPoints.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6; // Sum of squares of indices

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Generate optimization suggestions
   */
  _generateOptimizations() {
    const suggestions = [];

    // Agent count optimization
    const agentCount = this.metrics.agentPerformance.size;
    if (agentCount > 50) {
      suggestions.push({
        type: 'agent_optimization',
        priority: 'medium',
        suggestion: 'Consider implementing agent pooling or load balancing',
        impact: 'Improved scalability and resource utilization'
      });
    }

    // Network optimization
    const avgLatency = this._getAverageNetworkLatency();
    if (avgLatency > this.config.networkLatencyThreshold) {
      suggestions.push({
        type: 'network_optimization',
        priority: 'high',
        suggestion: 'Optimize network topology or implement message batching',
        impact: 'Reduced communication latency'
      });
    }

    // Memory optimization
    const currentMemory = this.metrics.memory[this.metrics.memory.length - 1]?.value?.system || 0;
    if (currentMemory > 0.7) {
      suggestions.push({
        type: 'memory_optimization',
        priority: 'medium',
        suggestion: 'Implement more aggressive garbage collection or data cleanup',
        impact: 'Reduced memory footprint'
      });
    }

    // Emit new suggestions
    suggestions.forEach(suggestion => {
      this.emit('optimizationSuggestion', suggestion);
    });

    this.optimizationSuggestions = suggestions;
  }

  /**
   * Get average network latency
   */
  _getAverageNetworkLatency() {
    if (this.metrics.networkLatency.length === 0) return 0;
    
    const sum = this.metrics.networkLatency.reduce((total, metric) => total + metric.value, 0);
    return sum / this.metrics.networkLatency.length;
  }

  /**
   * Record agent performance
   */
  recordAgentPerformance(agentId, performance) {
    this.metrics.agentPerformance.set(agentId, {
      ...performance,
      lastUpdated: Date.now()
    });

    // Clean up old agent data
    this._cleanupAgentData();
  }

  /**
   * Record network latency
   */
  recordNetworkLatency(latency) {
    this.metrics.networkLatency.push({
      timestamp: Date.now(),
      value: latency
    });

    // Keep only recent measurements
    if (this.metrics.networkLatency.length > 100) {
      this.metrics.networkLatency = this.metrics.networkLatency.slice(-100);
    }
  }

  /**
   * Record swarm efficiency
   */
  recordSwarmEfficiency(efficiency) {
    this.metrics.swarmEfficiency.push({
      timestamp: Date.now(),
      value: efficiency
    });

    // Keep only recent measurements
    if (this.metrics.swarmEfficiency.length > 100) {
      this.metrics.swarmEfficiency = this.metrics.swarmEfficiency.slice(-100);
    }
  }

  /**
   * Clean up old agent data
   */
  _cleanupAgentData() {
    const cutoff = Date.now() - (5 * 60 * 1000); // 5 minutes ago

    for (const [agentId, data] of this.metrics.agentPerformance.entries()) {
      if (data.lastUpdated < cutoff) {
        this.metrics.agentPerformance.delete(agentId);
      }
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const latestCpu = this.metrics.cpu[this.metrics.cpu.length - 1]?.value || 0;
    const latestMemory = this.metrics.memory[this.metrics.memory.length - 1]?.value?.system || 0;
    const avgLatency = this._getAverageNetworkLatency();
    const agentCount = this.metrics.agentPerformance.size;

    return {
      timestamp: Date.now(),
      system: {
        cpu: latestCpu,
        memory: latestMemory,
        status: this._getSystemStatus(latestCpu, latestMemory)
      },
      swarm: {
        agentCount,
        averageLatency: avgLatency,
        efficiency: this._getAverageEfficiency()
      },
      optimizations: this.optimizationSuggestions.length,
      issues: this._getActiveIssues()
    };
  }

  /**
   * Get system status
   */
  _getSystemStatus(cpu, memory) {
    if (cpu > this.config.maxCpuUsage || memory > this.config.maxMemoryUsage) {
      return 'critical';
    } else if (cpu > 0.7 || memory > 0.7) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get average efficiency
   */
  _getAverageEfficiency() {
    if (this.metrics.swarmEfficiency.length === 0) return 0;
    
    const sum = this.metrics.swarmEfficiency.reduce((total, metric) => total + metric.value, 0);
    return sum / this.metrics.swarmEfficiency.length;
  }

  /**
   * Get active issues
   */
  _getActiveIssues() {
    const issues = [];
    const latestCpu = this.metrics.cpu[this.metrics.cpu.length - 1]?.value || 0;
    const latestMemory = this.metrics.memory[this.metrics.memory.length - 1]?.value?.system || 0;
    const avgLatency = this._getAverageNetworkLatency();

    if (latestCpu > this.config.maxCpuUsage) {
      issues.push('High CPU usage');
    }
    if (latestMemory > this.config.maxMemoryUsage) {
      issues.push('High memory usage');
    }
    if (avgLatency > this.config.networkLatencyThreshold) {
      issues.push('High network latency');
    }

    return issues;
  }

  /**
   * Get detailed metrics
   */
  getDetailedMetrics() {
    return {
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      suggestions: this.optimizationSuggestions,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Apply optimization suggestion
   */
  async applyOptimization(suggestionId) {
    const suggestion = this.optimizationSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      throw new Error('Optimization suggestion not found');
    }

    logger.info(`Applying optimization: ${suggestion.type}`);

    // Emit optimization event for handlers
    this.emit('optimizationApplied', suggestion);

    // Remove applied suggestion
    this.optimizationSuggestions = this.optimizationSuggestions.filter(s => s.id !== suggestionId);

    return suggestion;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics() {
    this.metrics = {
      cpu: [],
      memory: [],
      networkLatency: [],
      agentPerformance: new Map(),
      swarmEfficiency: [],
      convergenceRate: []
    };
    this.optimizationSuggestions = [];
    this.performanceHistory = [];

    logger.info('Performance metrics reset');
  }

  /**
   * Export performance data
   */
  exportData(format = 'json') {
    const data = {
      timestamp: Date.now(),
      metrics: this.metrics,
      summary: this.getPerformanceSummary(),
      suggestions: this.optimizationSuggestions,
      config: this.config
    };

    if (format === 'csv') {
      return this._convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Convert metrics to CSV format
   */
  _convertToCSV(data) {
    const csvLines = [];
    
    // CPU metrics
    csvLines.push('Timestamp,Metric,Value');
    data.metrics.cpu.forEach(metric => {
      csvLines.push(`${metric.timestamp},cpu,${metric.value}`);
    });
    
    // Memory metrics
    data.metrics.memory.forEach(metric => {
      csvLines.push(`${metric.timestamp},memory,${metric.value.system}`);
    });

    return csvLines.join('\n');
  }
}

module.exports = PerformanceMonitor;
