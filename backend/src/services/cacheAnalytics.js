const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class CacheAnalytics extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            metricsRetentionDays: options.metricsRetentionDays || 30,
            analyticsInterval: options.analyticsInterval || 60000, // 1 minute
            reportInterval: options.reportInterval || 3600000, // 1 hour
            logFile: options.logFile || './cache-analytics.log',
            enableRealTimeAlerts: options.enableRealTimeAlerts || true,
            alertThresholds: {
                hitRate: options.alertThresholds?.hitRate || 80, // %
                responseTime: options.alertThresholds?.responseTime || 100, // ms
                errorRate: options.alertThresholds?.errorRate || 5, // %
                memoryUsage: options.alertThresholds?.memoryUsage || 90 // %
            }
        };

        this.metrics = {
            timestamp: Date.now(),
            l1: {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                size: 0,
                maxSize: 0,
                evictions: 0,
                hitRate: 0,
                averageResponseTime: 0
            },
            l2: {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                hitRate: 0,
                averageResponseTime: 0,
                clusterNodes: 0,
                totalMemory: 0,
                usedMemory: 0
            },
            l3: {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0,
                hitRate: 0,
                averageResponseTime: 0,
                bytesTransferred: 0,
                invalidations: 0
            },
            overall: {
                totalRequests: 0,
                overallHitRate: 0,
                averageResponseTime: 0,
                errors: 0,
                errorRate: 0
            }
        };

        this.historicalData = [];
        this.alerts = [];
        this.isCollecting = false;
        this.analyticsTimer = null;
        this.reportTimer = null;
    }

    // Start analytics collection
    start() {
        if (this.isCollecting) return;
        
        this.isCollecting = true;
        
        // Start periodic analytics collection
        this.analyticsTimer = setInterval(() => {
            this.collectMetrics();
        }, this.config.analyticsInterval);
        
        // Start periodic report generation
        this.reportTimer = setInterval(() => {
            this.generateReport();
        }, this.config.reportInterval);
        
        this.emit('started');
    }

    // Stop analytics collection
    stop() {
        if (!this.isCollecting) return;
        
        this.isCollecting = false;
        
        if (this.analyticsTimer) {
            clearInterval(this.analyticsTimer);
            this.analyticsTimer = null;
        }
        
        if (this.reportTimer) {
            clearInterval(this.reportTimer);
            this.reportTimer = null;
        }
        
        this.emit('stopped');
    }

    // Update metrics from cache system
    updateMetrics(cacheMetrics) {
        this.metrics.timestamp = Date.now();
        
        // Update L1 metrics
        if (cacheMetrics.l1) {
            this.metrics.l1 = { ...this.metrics.l1, ...cacheMetrics.l1 };
            this.metrics.l1.hitRate = this.calculateHitRate(this.metrics.l1.hits, this.metrics.l1.misses);
        }
        
        // Update L2 metrics
        if (cacheMetrics.l2) {
            this.metrics.l2 = { ...this.metrics.l2, ...cacheMetrics.l2 };
            this.metrics.l2.hitRate = this.calculateHitRate(this.metrics.l2.hits, this.metrics.l2.misses);
        }
        
        // Update L3 metrics
        if (cacheMetrics.l3) {
            this.metrics.l3 = { ...this.metrics.l3, ...cacheMetrics.l3 };
            this.metrics.l3.hitRate = this.calculateHitRate(this.metrics.l3.hits, this.metrics.l3.misses);
        }
        
        // Update overall metrics
        this.metrics.overall = { ...this.metrics.overall, ...cacheMetrics.overall };
        this.metrics.overall.overallHitRate = this.calculateOverallHitRate();
        this.metrics.overall.errorRate = this.calculateErrorRate();
        
        // Check for alerts
        if (this.config.enableRealTimeAlerts) {
            this.checkAlerts();
        }
    }

    // Calculate hit rate
    calculateHitRate(hits, misses) {
        const total = hits + misses;
        return total > 0 ? (hits / total) * 100 : 0;
    }

    // Calculate overall hit rate
    calculateOverallHitRate() {
        const totalHits = this.metrics.l1.hits + this.metrics.l2.hits + this.metrics.l3.hits;
        const totalMisses = this.metrics.l1.misses + this.metrics.l2.misses + this.metrics.l3.misses;
        const total = totalHits + totalMisses;
        return total > 0 ? (totalHits / total) * 100 : 0;
    }

    // Calculate error rate
    calculateErrorRate() {
        const total = this.metrics.overall.totalRequests;
        return total > 0 ? (this.metrics.overall.errors / total) * 100 : 0;
    }

    // Check for alerts
    checkAlerts() {
        const alerts = [];
        
        // Hit rate alert
        if (this.metrics.overall.overallHitRate < this.config.alertThresholds.hitRate) {
            alerts.push({
                type: 'hit_rate',
                severity: 'warning',
                message: `Cache hit rate (${this.metrics.overall.overallHitRate.toFixed(2)}%) below threshold (${this.config.alertThresholds.hitRate}%)`,
                timestamp: Date.now()
            });
        }
        
        // Response time alert
        if (this.metrics.overall.averageResponseTime > this.config.alertThresholds.responseTime) {
            alerts.push({
                type: 'response_time',
                severity: 'warning',
                message: `Average response time (${this.metrics.overall.averageResponseTime.toFixed(2)}ms) above threshold (${this.config.alertThresholds.responseTime}ms)`,
                timestamp: Date.now()
            });
        }
        
        // Error rate alert
        if (this.metrics.overall.errorRate > this.config.alertThresholds.errorRate) {
            alerts.push({
                type: 'error_rate',
                severity: 'critical',
                message: `Error rate (${this.metrics.overall.errorRate.toFixed(2)}%) above threshold (${this.config.alertThresholds.errorRate}%)`,
                timestamp: Date.now()
            });
        }
        
        // Memory usage alert (for L1)
        if (this.metrics.l1.maxSize > 0) {
            const memoryUsage = (this.metrics.l1.size / this.metrics.l1.maxSize) * 100;
            if (memoryUsage > this.config.alertThresholds.memoryUsage) {
                alerts.push({
                    type: 'memory_usage',
                    severity: 'warning',
                    message: `L1 cache memory usage (${memoryUsage.toFixed(2)}%) above threshold (${this.config.alertThresholds.memoryUsage}%)`,
                    timestamp: Date.now()
                });
            }
        }
        
        // Emit alerts
        alerts.forEach(alert => {
            this.alerts.push(alert);
            this.emit('alert', alert);
        });
        
        // Keep only recent alerts
        this.alerts = this.alerts.slice(-100);
    }

    // Collect metrics snapshot
    collectMetrics() {
        const snapshot = {
            timestamp: Date.now(),
            metrics: JSON.parse(JSON.stringify(this.metrics))
        };
        
        this.historicalData.push(snapshot);
        
        // Trim old data
        const cutoffTime = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
        this.historicalData = this.historicalData.filter(data => data.timestamp > cutoffTime);
        
        // Log metrics
        this.logMetrics(snapshot);
        
        this.emit('metricsCollected', snapshot);
    }

    // Log metrics to file
    async logMetrics(snapshot) {
        try {
            const logEntry = `${new Date(snapshot.timestamp).toISOString()} - ${JSON.stringify(snapshot.metrics)}\n`;
            await fs.appendFile(this.config.logFile, logEntry);
        } catch (error) {
            this.emit('error', { operation: 'logMetrics', error });
        }
    }

    // Generate analytics report
    generateReport() {
        const report = {
            timestamp: Date.now(),
            period: {
                start: this.historicalData.length > 0 ? this.historicalData[0].timestamp : Date.now(),
                end: Date.now(),
                duration: this.historicalData.length > 0 ? Date.now() - this.historicalData[0].timestamp : 0
            },
            summary: this.generateSummary(),
            trends: this.analyzeTrends(),
            performance: this.analyzePerformance(),
            alerts: this.alerts.slice(-10), // Recent alerts
            recommendations: this.generateRecommendations()
        };
        
        this.emit('reportGenerated', report);
        
        // Save report to file
        this.saveReport(report);
        
        return report;
    }

    // Generate summary statistics
    generateSummary() {
        if (this.historicalData.length === 0) {
            return {};
        }
        
        const data = this.historicalData;
        const latest = data[data.length - 1].metrics;
        
        return {
            totalRequests: latest.overall.totalRequests,
            overallHitRate: latest.overall.overallHitRate,
            averageResponseTime: latest.overall.averageResponseTime,
            errorRate: latest.overall.errorRate,
            l1HitRate: latest.l1.hitRate,
            l2HitRate: latest.l2.hitRate,
            l3HitRate: latest.l3.hitRate,
            l1Size: latest.l1.size,
            l1MaxSize: latest.l1.maxSize,
            l2ClusterNodes: latest.l2.clusterNodes,
            l3BytesTransferred: latest.l3.bytesTransferred
        };
    }

    // Analyze trends
    analyzeTrends() {
        if (this.historicalData.length < 2) {
            return {};
        }
        
        const data = this.historicalData;
        const recent = data.slice(-10); // Last 10 data points
        const older = data.slice(-20, -10); // Previous 10 data points
        
        if (recent.length === 0 || older.length === 0) {
            return {};
        }
        
        const calculateAverage = (arr, path) => {
            const values = arr.map(item => this.getNestedValue(item.metrics, path)).filter(v => v !== undefined);
            return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        };
        
        const recentAvg = {
            hitRate: calculateAverage(recent, 'overall.overallHitRate'),
            responseTime: calculateAverage(recent, 'overall.averageResponseTime'),
            errorRate: calculateAverage(recent, 'overall.errorRate')
        };
        
        const olderAvg = {
            hitRate: calculateAverage(older, 'overall.overallHitRate'),
            responseTime: calculateAverage(older, 'overall.averageResponseTime'),
            errorRate: calculateAverage(older, 'overall.errorRate')
        };
        
        return {
            hitRate: {
                current: recentAvg.hitRate,
                previous: olderAvg.hitRate,
                trend: recentAvg.hitRate > olderAvg.hitRate ? 'improving' : 'declining',
                change: recentAvg.hitRate - olderAvg.hitRate
            },
            responseTime: {
                current: recentAvg.responseTime,
                previous: olderAvg.responseTime,
                trend: recentAvg.responseTime < olderAvg.responseTime ? 'improving' : 'declining',
                change: recentAvg.responseTime - olderAvg.responseTime
            },
            errorRate: {
                current: recentAvg.errorRate,
                previous: olderAvg.errorRate,
                trend: recentAvg.errorRate < olderAvg.errorRate ? 'improving' : 'declining',
                change: recentAvg.errorRate - olderAvg.errorRate
            }
        };
    }

    // Analyze performance
    analyzePerformance() {
        if (this.historicalData.length === 0) {
            return {};
        }
        
        const data = this.historicalData;
        const responseTimes = data.map(item => item.metrics.overall.averageResponseTime).filter(rt => rt > 0);
        const hitRates = data.map(item => item.metrics.overall.overallHitRate).filter(hr => hr >= 0);
        
        return {
            responseTime: {
                min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
                max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
                average: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
                p95: this.calculatePercentile(responseTimes, 95),
                p99: this.calculatePercentile(responseTimes, 99)
            },
            hitRate: {
                min: hitRates.length > 0 ? Math.min(...hitRates) : 0,
                max: hitRates.length > 0 ? Math.max(...hitRates) : 0,
                average: hitRates.length > 0 ? hitRates.reduce((a, b) => a + b, 0) / hitRates.length : 0,
                p95: this.calculatePercentile(hitRates, 95),
                p99: this.calculatePercentile(hitRates, 99)
            }
        };
    }

    // Generate recommendations
    generateRecommendations() {
        const recommendations = [];
        const latest = this.metrics;
        
        // Hit rate recommendations
        if (latest.overall.overallHitRate < 80) {
            recommendations.push({
                type: 'optimization',
                priority: 'high',
                message: 'Consider increasing cache TTL or implementing cache warming strategies to improve hit rate',
                metric: 'hit_rate',
                value: latest.overall.overallHitRate
            });
        }
        
        // Response time recommendations
        if (latest.overall.averageResponseTime > 100) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Response time is above optimal range. Consider optimizing cache key distribution or adding more cluster nodes',
                metric: 'response_time',
                value: latest.overall.averageResponseTime
            });
        }
        
        // Memory usage recommendations
        if (latest.l1.maxSize > 0 && (latest.l1.size / latest.l1.maxSize) > 0.9) {
            recommendations.push({
                type: 'capacity',
                priority: 'medium',
                message: 'L1 cache is nearing capacity. Consider increasing size or implementing more aggressive eviction policies',
                metric: 'memory_usage',
                value: (latest.l1.size / latest.l1.maxSize) * 100
            });
        }
        
        // Error rate recommendations
        if (latest.overall.errorRate > 5) {
            recommendations.push({
                type: 'reliability',
                priority: 'high',
                message: 'Error rate is elevated. Review cluster health and network connectivity',
                metric: 'error_rate',
                value: latest.overall.errorRate
            });
        }
        
        return recommendations;
    }

    // Calculate percentile
    calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    // Get nested value from object
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Save report to file
    async saveReport(report) {
        try {
            const filename = `cache-report-${new Date(report.timestamp).toISOString().split('T')[0]}.json`;
            const filepath = path.join(path.dirname(this.config.logFile), filename);
            await fs.writeFile(filepath, JSON.stringify(report, null, 2));
        } catch (error) {
            this.emit('error', { operation: 'saveReport', error });
        }
    }

    // Get current metrics
    getCurrentMetrics() {
        return this.metrics;
    }

    // Get historical data
    getHistoricalData(options = {}) {
        const { startTime, endTime, limit } = options;
        let data = this.historicalData;
        
        if (startTime) {
            data = data.filter(item => item.timestamp >= startTime);
        }
        
        if (endTime) {
            data = data.filter(item => item.timestamp <= endTime);
        }
        
        if (limit) {
            data = data.slice(-limit);
        }
        
        return data;
    }

    // Get recent alerts
    getRecentAlerts(limit = 10) {
        return this.alerts.slice(-limit);
    }

    // Export analytics data
    async exportData(format = 'json') {
        const data = {
            metrics: this.metrics,
            historicalData: this.historicalData,
            alerts: this.alerts,
            exportTimestamp: Date.now()
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data.historicalData);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // Convert to CSV format
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = [
            'timestamp',
            'overall.totalRequests',
            'overall.overallHitRate',
            'overall.averageResponseTime',
            'overall.errorRate',
            'l1.hitRate',
            'l2.hitRate',
            'l3.hitRate'
        ];
        
        const rows = data.map(item => {
            const metrics = item.metrics;
            return [
                new Date(item.timestamp).toISOString(),
                metrics.overall.totalRequests,
                metrics.overall.overallHitRate,
                metrics.overall.averageResponseTime,
                metrics.overall.errorRate,
                metrics.l1.hitRate,
                metrics.l2.hitRate,
                metrics.l3.hitRate
            ].join(',');
        });
        
        return [headers.join(','), ...rows].join('\n');
    }
}

module.exports = CacheAnalytics;
