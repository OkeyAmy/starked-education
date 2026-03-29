/**
 * Optimization Analytics and Visualization System
 * Provides comprehensive analytics, metrics, and visualization data for ACO systems
 */
class OptimizationAnalytics {
  constructor(options = {}) {
    this.metrics = new Map();
    this.visualizations = new Map();
    this.reports = new Map();
    this.realTimeData = new Map();
    this.benchmarks = new Map();
    
    // Analytics configuration
    this.aggregationInterval = options.aggregationInterval || 60000; // 1 minute
    this.retentionPeriod = options.retentionPeriod || 24 * 60 * 60 * 1000; // 24 hours
    this.enableRealTime = options.enableRealTime || true;
    
    // Start data collection
    if (this.enableRealTime) {
      this.startDataCollection();
    }
  }

  /**
   * Start real-time data collection
   */
  startDataCollection() {
    this.collectionTimer = setInterval(() => {
      this.collectRealTimeData();
    }, this.aggregationInterval);
  }

  /**
   * Stop data collection
   */
  stopDataCollection() {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = null;
    }
  }

  /**
   * Record optimization metrics
   */
  recordMetrics(sessionId, metrics) {
    const timestamp = new Date();
    
    if (!this.metrics.has(sessionId)) {
      this.metrics.set(sessionId, {
        sessionId,
        startTime: timestamp,
        endTime: null,
        iterations: [],
        convergence: [],
        performance: [],
        resourceUsage: [],
        qualityMetrics: []
      });
    }

    const session = this.metrics.get(sessionId);
    
    // Record iteration data
    if (metrics.iteration !== undefined) {
      session.iterations.push({
        timestamp,
        iteration: metrics.iteration,
        bestFitness: metrics.bestFitness || 0,
        averageFitness: metrics.averageFitness || 0,
        worstFitness: metrics.worstFitness || 0,
        diversity: metrics.diversity || 0,
        convergenceRate: metrics.convergenceRate || 0
      });
    }

    // Record convergence data
    if (metrics.convergenceData) {
      session.convergence.push({
        timestamp,
        ...metrics.convergenceData
      });
    }

    // Record performance metrics
    if (metrics.performance) {
      session.performance.push({
        timestamp,
        ...metrics.performance
      });
    }

    // Record resource usage
    if (metrics.resourceUsage) {
      session.resourceUsage.push({
        timestamp,
        ...metrics.resourceUsage
      });
    }

    // Record quality metrics
    if (metrics.qualityMetrics) {
      session.qualityMetrics.push({
        timestamp,
        ...metrics.qualityMetrics
      });
    }

    // Update end time
    session.endTime = timestamp;
  }

  /**
   * Generate convergence visualization data
   */
  generateConvergenceVisualization(sessionId) {
    const session = this.metrics.get(sessionId);
    if (!session || !session.iterations.length) {
      return { error: 'No data available for session' };
    }

    const iterations = session.iterations;
    
    // Prepare data for line chart
    const convergenceData = {
      type: 'convergence',
      data: {
        labels: iterations.map(i => i.iteration),
        datasets: [
          {
            label: 'Best Fitness',
            data: iterations.map(i => i.bestFitness),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1
          },
          {
            label: 'Average Fitness',
            data: iterations.map(i => i.averageFitness),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1
          },
          {
            label: 'Diversity',
            data: iterations.map(i => i.diversity),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Fitness Value'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Iteration'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Convergence Analysis'
          }
        }
      }
    };

    this.visualizations.set(`${sessionId}_convergence`, convergenceData);
    return convergenceData;
  }

  /**
   * Generate performance heatmap
   */
  generatePerformanceHeatmap(sessionId) {
    const session = this.metrics.get(sessionId);
    if (!session || !session.performance.length) {
      return { error: 'No performance data available' };
    }

    const performance = session.performance;
    
    // Create heatmap data
    const heatmapData = {
      type: 'heatmap',
      data: {
        labels: performance.map(p => p.timestamp.toLocaleTimeString()),
        datasets: [{
          label: 'Performance Metrics',
          data: performance.map(p => ({
            x: p.timestamp.toLocaleTimeString(),
            y: 'CPU Usage',
            v: p.cpuUsage || 0
          })).concat(
            performance.map(p => ({
              x: p.timestamp.toLocaleTimeString(),
              y: 'Memory Usage',
              v: p.memoryUsage || 0
            }))
          ),
          backgroundColor: (ctx) => {
            const value = ctx.parsed.v;
            const alpha = value / 100;
            return `rgba(255, 99, 132, ${alpha})`;
          }
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'category',
            labels: performance.map(p => p.timestamp.toLocaleTimeString())
          },
          y: {
            type: 'category',
            labels: ['CPU Usage', 'Memory Usage']
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Resource Usage Heatmap'
          }
        }
      }
    };

    this.visualizations.set(`${sessionId}_heatmap`, heatmapData);
    return heatmapData;
  }

  /**
   * Generate solution quality radar chart
   */
  generateQualityRadar(sessionId) {
    const session = this.metrics.get(sessionId);
    if (!session || !session.qualityMetrics.length) {
      return { error: 'No quality metrics available' };
    }

    const latestQuality = session.qualityMetrics[session.qualityMetrics.length - 1];
    
    const radarData = {
      type: 'radar',
      data: {
        labels: ['Efficiency', 'Scalability', 'Robustness', 'Adaptability', 'Optimality'],
        datasets: [{
          label: 'Solution Quality',
          data: [
            latestQuality.efficiency || 0,
            latestQuality.scalability || 0,
            latestQuality.robustness || 0,
            latestQuality.adaptability || 0,
            latestQuality.optimality || 0
          ],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgb(255, 99, 132)',
          pointBackgroundColor: 'rgb(255, 99, 132)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(255, 99, 132)'
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 1
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Solution Quality Metrics'
          }
        }
      }
    };

    this.visualizations.set(`${sessionId}_radar`, radarData);
    return radarData;
  }

  /**
   * Generate swarm intelligence visualization
   */
  generateSwarmVisualization(swarmData) {
    const visualization = {
      type: 'swarm',
      data: {
        colonies: swarmData.colonies || [],
        communications: swarmData.communications || [],
        performance: swarmData.performance || {},
        specialization: swarmData.specialization || {}
      },
      options: {
        responsive: true,
        layout: {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'directed'
          }
        },
        nodes: {
          shape: 'dot',
          size: 16,
          font: {
            size: 14
          }
        },
        edges: {
          width: 2,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 1
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Swarm Intelligence Network'
          }
        }
      }
    };

    this.visualizations.set('swarm_network', visualization);
    return visualization;
  }

  /**
   * Generate learning path visualization
   */
  generateLearningPathVisualization(pathData) {
    const visualization = {
      type: 'learning_path',
      data: {
        nodes: pathData.courses || [],
        edges: pathData.connections || [],
        metadata: pathData.metadata || {}
      },
      options: {
        responsive: true,
        layout: {
          hierarchical: {
            direction: 'LR',
            sortMethod: 'directed'
          }
        },
        nodes: {
          shape: 'box',
          margin: 10,
          font: {
            size: 12
          },
          color: {
            background: '#e3f2fd',
            border: '#2196f3'
          }
        },
        edges: {
          width: 2,
          arrows: 'to',
          smooth: {
            type: 'cubicBezier'
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Optimized Learning Path'
          }
        }
      }
    };

    this.visualizations.set('learning_path', visualization);
    return visualization;
  }

  /**
   * Generate resource allocation visualization
   */
  generateResourceVisualization(allocationData) {
    const visualization = {
      type: 'resource_allocation',
      data: {
        resources: allocationData.resources || [],
        allocations: allocationData.allocations || [],
        utilization: allocationData.utilization || {}
      },
      charts: {
        utilization: {
          type: 'bar',
          data: {
            labels: Object.keys(allocationData.utilization || {}),
            datasets: [{
              label: 'Resource Utilization',
              data: Object.values(allocationData.utilization || {}),
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Resource Utilization (%)'
              }
            }
          }
        },
        efficiency: {
          type: 'line',
          data: {
            labels: allocationData.efficiencyHistory?.map((_, i) => `T${i}`) || [],
            datasets: [{
              label: 'Efficiency Score',
              data: allocationData.efficiencyHistory || [],
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: 'Allocation Efficiency Over Time'
              }
            }
          }
        }
      }
    };

    this.visualizations.set('resource_allocation', visualization);
    return visualization;
  }

  /**
   * Collect real-time data
   */
  collectRealTimeData() {
    const timestamp = new Date();
    
    // Collect system metrics
    const systemMetrics = {
      timestamp,
      cpuUsage: this.getCPUUsage(),
      memoryUsage: this.getMemoryUsage(),
      activeSessions: this.metrics.size,
      totalVisualizations: this.visualizations.size
    };

    this.realTimeData.set('system', systemMetrics);
    
    // Clean up old data
    this.cleanupOldData();
  }

  /**
   * Get CPU usage (mock implementation)
   */
  getCPUUsage() {
    return Math.random() * 100;
  }

  /**
   * Get memory usage (mock implementation)
   */
  getMemoryUsage() {
    return Math.random() * 100;
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const cutoffTime = new Date(Date.now() - this.retentionPeriod);
    
    // Clean up old metrics
    for (const [sessionId, session] of this.metrics) {
      if (session.endTime && session.endTime < cutoffTime) {
        this.metrics.delete(sessionId);
      }
    }
    
    // Clean up old visualizations
    for (const [vizId, visualization] of this.visualizations) {
      if (visualization.timestamp && visualization.timestamp < cutoffTime) {
        this.visualizations.delete(vizId);
      }
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(sessionId, reportType = 'comprehensive') {
    const session = this.metrics.get(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    const report = {
      sessionId,
      reportType,
      generatedAt: new Date(),
      summary: this.generateSummary(session),
      performance: this.generatePerformanceReport(session),
      quality: this.generateQualityReport(session),
      recommendations: this.generateRecommendations(session)
    };

    this.reports.set(`${sessionId}_${reportType}_${Date.now()}`, report);
    return report;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(session) {
    const iterations = session.iterations;
    if (!iterations.length) return {};

    const bestFitness = Math.max(...iterations.map(i => i.bestFitness));
    const averageFitness = iterations.reduce((sum, i) => sum + i.averageFitness, 0) / iterations.length;
    const convergenceRate = this.calculateConvergenceRate(iterations);
    const totalTime = session.endTime - session.startTime;

    return {
      totalIterations: iterations.length,
      bestFitness,
      averageFitness,
      convergenceRate,
      totalTime,
      efficiency: bestFitness / iterations.length
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(session) {
    const performance = session.performance;
    if (!performance.length) return {};

    const avgCPU = performance.reduce((sum, p) => sum + (p.cpuUsage || 0), 0) / performance.length;
    const avgMemory = performance.reduce((sum, p) => sum + (p.memoryUsage || 0), 0) / performance.length;

    return {
      averageCPUUsage: avgCPU,
      averageMemoryUsage: avgMemory,
      peakCPU: Math.max(...performance.map(p => p.cpuUsage || 0)),
      peakMemory: Math.max(...performance.map(p => p.memoryUsage || 0)),
      resourceEfficiency: (avgCPU + avgMemory) / 200
    };
  }

  /**
   * Generate quality report
   */
  generateQualityReport(session) {
    const quality = session.qualityMetrics;
    if (!quality.length) return {};

    const latest = quality[quality.length - 1];
    
    return {
      efficiency: latest.efficiency || 0,
      scalability: latest.scalability || 0,
      robustness: latest.robustness || 0,
      adaptability: latest.adaptability || 0,
      optimality: latest.optimality || 0,
      overallQuality: (latest.efficiency + latest.scalability + latest.robustness + 
                      latest.adaptability + latest.optimality) / 5
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(session) {
    const recommendations = [];
    const summary = this.generateSummary(session);
    const performance = this.generatePerformanceReport(session);
    const quality = this.generateQualityReport(session);

    // Performance recommendations
    if (performance.averageCPUUsage > 80) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'High CPU usage detected. Consider reducing ant count or iteration frequency.',
        action: 'reduce_ants'
      });
    }

    if (performance.averageMemoryUsage > 80) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'High memory usage detected. Consider implementing memory optimization.',
        action: 'optimize_memory'
      });
    }

    // Quality recommendations
    if (summary.convergenceRate < 0.1) {
      recommendations.push({
        type: 'quality',
        priority: 'high',
        message: 'Slow convergence detected. Consider adjusting parameters or using elitist strategy.',
        action: 'adjust_parameters'
      });
    }

    if (quality.overallQuality < 0.5) {
      recommendations.push({
        type: 'quality',
        priority: 'medium',
        message: 'Low solution quality. Consider increasing population size or iterations.',
        action: 'increase_population'
      });
    }

    return recommendations;
  }

  /**
   * Calculate convergence rate
   */
  calculateConvergenceRate(iterations) {
    if (iterations.length < 2) return 0;

    let improvements = 0;
    for (let i = 1; i < iterations.length; i++) {
      if (iterations[i].bestFitness > iterations[i-1].bestFitness) {
        improvements++;
      }
    }

    return improvements / (iterations.length - 1);
  }

  /**
   * Get visualization data
   */
  getVisualization(vizId) {
    return this.visualizations.get(vizId);
  }

  /**
   * Get all visualizations
   */
  getAllVisualizations() {
    return Array.from(this.visualizations.entries()).map(([id, viz]) => ({ id, ...viz }));
  }

  /**
   * Get real-time data
   */
  getRealTimeData() {
    return Array.from(this.realTimeData.entries()).map(([key, data]) => ({ key, ...data }));
  }

  /**
   * Export analytics data
   */
  exportData(format = 'json') {
    const data = {
      metrics: Object.fromEntries(this.metrics),
      visualizations: Object.fromEntries(this.visualizations),
      reports: Object.fromEntries(this.reports),
      realTimeData: Object.fromEntries(this.realTimeData),
      exportedAt: new Date()
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        return data;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion for metrics
    const csvRows = [];
    csvRows.push('Session ID,Iteration,Best Fitness,Average Fitness,Diversity,Timestamp');

    for (const [sessionId, session] of Object.entries(data.metrics)) {
      for (const iteration of session.iterations) {
        csvRows.push([
          sessionId,
          iteration.iteration,
          iteration.bestFitness,
          iteration.averageFitness,
          iteration.diversity,
          iteration.timestamp
        ].join(','));
      }
    }

    return csvRows.join('\n');
  }

  /**
   * Set benchmark data
   */
  setBenchmark(benchmarkId, data) {
    this.benchmarks.set(benchmarkId, {
      id: benchmarkId,
      data,
      createdAt: new Date()
    });
  }

  /**
   * Compare with benchmarks
   */
  compareWithBenchmark(sessionId, benchmarkId) {
    const session = this.metrics.get(sessionId);
    const benchmark = this.benchmarks.get(benchmarkId);
    
    if (!session || !benchmark) {
      return { error: 'Session or benchmark not found' };
    }

    const sessionSummary = this.generateSummary(session);
    const benchmarkData = benchmark.data;

    return {
      sessionId,
      benchmarkId,
      comparison: {
        fitnessImprovement: ((sessionSummary.bestFitness - benchmarkData.bestFitness) / benchmarkData.bestFitness) * 100,
        convergenceImprovement: sessionSummary.convergenceRate - benchmarkData.convergenceRate,
        efficiencyImprovement: sessionSummary.efficiency - benchmarkData.efficiency
      }
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopDataCollection();
    this.metrics.clear();
    this.visualizations.clear();
    this.reports.clear();
    this.realTimeData.clear();
    this.benchmarks.clear();
  }
}

module.exports = OptimizationAnalytics;
