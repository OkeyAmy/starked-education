/**
 * Delivery Performance Analytics Service
 * Comprehensive analytics for content delivery performance and optimization
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';

export interface DeliveryMetrics {
  timestamp: Date;
  contentId: string;
  clientId: string;
  providerId: string;
  region: string;
  deliveryTime: number; // in ms
  firstByteTime: number; // in ms
  downloadTime: number; // in ms
  totalBytes: number;
  throughput: number; // in kbps
  cacheHit: boolean;
  errorCount: number;
  statusCode: number;
  userAgent: string;
  connectionType: string;
}

export interface PerformanceReport {
  id: string;
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: PerformanceSummary;
  providerBreakdown: ProviderPerformance[];
  regionalBreakdown: RegionalPerformance[];
  contentTypeBreakdown: ContentTypePerformance[];
  trends: PerformanceTrends[];
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageDeliveryTime: number;
  averageThroughput: number;
  cacheHitRate: number;
  errorRate: number;
  totalBytesDelivered: number;
  costEfficiency: number;
  userSatisfactionScore: number;
}

export interface ProviderPerformance {
  providerId: string;
  providerName: string;
  requests: number;
  successRate: number;
  averageLatency: number;
  averageThroughput: number;
  cacheHitRate: number;
  costPerGB: number;
  reliability: number;
  userRating: number;
}

export interface RegionalPerformance {
  region: string;
  country: string;
  requests: number;
  averageLatency: number;
  averageThroughput: number;
  errorRate: number;
  cacheHitRate: number;
  optimalProvider: string;
  performanceScore: number;
}

export interface ContentTypePerformance {
  contentType: string;
  requests: number;
  averageSize: number;
  averageDeliveryTime: number;
  averageThroughput: number;
  compressionRatio: number;
  optimalFormat: string;
  adaptationFrequency: number;
}

export interface PerformanceTrends {
  metric: string;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number; // percentage change
  timePeriod: string;
  dataPoints: TrendDataPoint[];
}

export interface TrendDataPoint {
  timestamp: Date;
  value: number;
}

export interface PerformanceRecommendation {
  id: string;
  type: 'optimization' | 'configuration' | 'cost' | 'capacity';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  expectedImpact: string;
  implementationEffort: 'low' | 'medium' | 'high';
  estimatedSavings?: number;
  actionItems: string[];
}

export interface RealTimeAlert {
  id: string;
  type: 'performance' | 'availability' | 'cost' | 'capacity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  affectedResources: string[];
  metrics: Record<string, number>;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface PerformanceThreshold {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'warning' | 'error' | 'critical';
  cooldownPeriod: number; // in minutes
}

export class DeliveryAnalyticsService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private metrics: DeliveryMetrics[] = [];
  private reports: Map<string, PerformanceReport> = new Map();
  private alerts: Map<string, RealTimeAlert> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private aggregationInterval?: any;
  private alertingInterval?: any;

  constructor() {
    this.initializeThresholds();
    this.startMetricsAggregation();
    this.startRealTimeMonitoring();
  }

  /**
   * Initialize performance thresholds for alerting
   */
  private initializeThresholds(): void {
    const thresholds: PerformanceThreshold[] = [
      {
        metric: 'deliveryTime',
        operator: 'greater_than',
        threshold: 5000, // 5 seconds
        severity: 'warning',
        cooldownPeriod: 15
      },
      {
        metric: 'deliveryTime',
        operator: 'greater_than',
        threshold: 10000, // 10 seconds
        severity: 'error',
        cooldownPeriod: 10
      },
      {
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 5, // 5%
        severity: 'warning',
        cooldownPeriod: 20
      },
      {
        metric: 'errorRate',
        operator: 'greater_than',
        threshold: 10, // 10%
        severity: 'critical',
        cooldownPeriod: 5
      },
      {
        metric: 'cacheHitRate',
        operator: 'less_than',
        threshold: 70, // 70%
        severity: 'warning',
        cooldownPeriod: 30
      },
      {
        metric: 'throughput',
        operator: 'less_than',
        threshold: 500, // 500 kbps
        severity: 'warning',
        cooldownPeriod: 15
      }
    ];

    thresholds.forEach((threshold, index) => {
      this.thresholds.set(`threshold_${index}`, threshold);
    });

    logger.info(`Initialized ${thresholds.length} performance thresholds`);
  }

  /**
   * Record delivery metrics
   */
  recordDeliveryMetrics(metrics: DeliveryMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 100,000 metrics to prevent memory issues
    if (this.metrics.length > 100000) {
      this.metrics.splice(0, this.metrics.length - 100000);
    }

    // Check for threshold violations
    this.checkThresholds(metrics);

    // Emit event for real-time monitoring
    this.eventEmitter.emit('metrics:recorded', metrics);

    logger.debug(`Recorded delivery metrics for content ${metrics.contentId}`);
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  private checkThresholds(metrics: DeliveryMetrics): void {
    const metricValues: Record<string, number> = {
      deliveryTime: metrics.deliveryTime,
      throughput: metrics.throughput,
      errorRate: metrics.errorCount > 0 ? 100 : 0,
      cacheHitRate: metrics.cacheHit ? 100 : 0
    };

    this.thresholds.forEach((threshold, thresholdId) => {
      const value = metricValues[threshold.metric];
      if (value === undefined) return;

      const violation = this.evaluateThreshold(value, threshold);
      if (violation) {
        this.generateAlert(threshold, metrics, value, thresholdId);
      }
    });
  }

  /**
   * Evaluate if threshold is violated
   */
  private evaluateThreshold(value: number, threshold: PerformanceThreshold): boolean {
    switch (threshold.operator) {
      case 'greater_than':
        return value > threshold.threshold;
      case 'less_than':
        return value < threshold.threshold;
      case 'equals':
        return value === threshold.threshold;
      default:
        return false;
    }
  }

  /**
   * Generate alert for threshold violation
   */
  private generateAlert(
    threshold: PerformanceThreshold,
    metrics: DeliveryMetrics,
    value: number,
    thresholdId: string
  ): void {
    // Check cooldown period
    const lastAlert = Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .find(alert => alert.type === 'performance' && 
        alert.metrics[threshold.metric] !== undefined);

    if (lastAlert && (Date.now() - lastAlert.timestamp.getTime()) < threshold.cooldownPeriod * 60 * 1000) {
      return; // Still in cooldown period
    }

    const alert: RealTimeAlert = {
      id: this.generateAlertId(),
      type: 'performance',
      severity: threshold.severity,
      title: `Performance Threshold Violation: ${threshold.metric}`,
      description: `${threshold.metric} is ${value} (threshold: ${threshold.threshold}) for content ${metrics.contentId}`,
      timestamp: new Date(),
      affectedResources: [metrics.contentId, metrics.providerId, metrics.region],
      metrics: { [threshold.metric]: value },
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    this.eventEmitter.emit('alert:generated', alert);

    logger.warn(`Performance alert generated: ${alert.title}`);
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    timeRange: { start: Date; end: Date },
    filters?: {
      providerIds?: string[];
      regions?: string[];
      contentTypes?: string[];
    }
  ): Promise<PerformanceReport> {
    try {
      logger.info(`Generating performance report for ${timeRange.start.toISOString()} to ${timeRange.end.toISOString()}`);

      // Filter metrics based on time range and filters
      const filteredMetrics = this.filterMetrics(this.metrics, timeRange, filters);

      if (filteredMetrics.length === 0) {
        throw new Error('No metrics found for the specified time range and filters');
      }

      // Generate report components
      const summary = this.generateSummary(filteredMetrics);
      const providerBreakdown = this.generateProviderBreakdown(filteredMetrics);
      const regionalBreakdown = this.generateRegionalBreakdown(filteredMetrics);
      const contentTypeBreakdown = this.generateContentTypeBreakdown(filteredMetrics);
      const trends = this.generateTrends(filteredMetrics, timeRange);
      const recommendations = this.generateRecommendations(summary, providerBreakdown, regionalBreakdown);

      const report: PerformanceReport = {
        id: this.generateReportId(),
        generatedAt: new Date(),
        timeRange,
        summary,
        providerBreakdown,
        regionalBreakdown,
        contentTypeBreakdown,
        trends,
        recommendations
      };

      this.reports.set(report.id, report);
      this.eventEmitter.emit('report:generated', report);

      logger.info(`Performance report generated: ${report.id}`);
      return report;
    } catch (error) {
      logger.error('Error generating performance report:', error);
      throw error;
    }
  }

  /**
   * Filter metrics based on time range and filters
   */
  private filterMetrics(
    metrics: DeliveryMetrics[],
    timeRange: { start: Date; end: Date },
    filters?: {
      providerIds?: string[];
      regions?: string[];
      contentTypes?: string[];
    }
  ): DeliveryMetrics[] {
    return metrics.filter(metric => {
      // Time range filter
      if (metric.timestamp < timeRange.start || metric.timestamp > timeRange.end) {
        return false;
      }

      // Provider filter
      if (filters?.providerIds && !filters.providerIds.includes(metric.providerId)) {
        return false;
      }

      // Region filter
      if (filters?.regions && !filters.regions.includes(metric.region)) {
        return false;
      }

      // Content type filter (would need content type info in metrics)
      // if (filters?.contentTypes && !filters.contentTypes.includes(metric.contentType)) {
      //   return false;
      // }

      return true;
    });
  }

  /**
   * Generate performance summary
   */
  private generateSummary(metrics: DeliveryMetrics[]): PerformanceSummary {
    const totalRequests = metrics.length;
    const successfulRequests = metrics.filter(m => m.statusCode < 400).length;
    const failedRequests = totalRequests - successfulRequests;
    const totalBytes = metrics.reduce((sum, m) => sum + m.totalBytes, 0);
    const cacheHits = metrics.filter(m => m.cacheHit).length;

    const averageDeliveryTime = metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / totalRequests;
    const averageThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / totalRequests;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      averageThroughput: Math.round(averageThroughput),
      cacheHitRate: (cacheHits / totalRequests) * 100,
      errorRate: (failedRequests / totalRequests) * 100,
      totalBytesDelivered: totalBytes,
      costEfficiency: this.calculateCostEfficiency(metrics),
      userSatisfactionScore: this.calculateUserSatisfaction(metrics)
    };
  }

  /**
   * Generate provider performance breakdown
   */
  private generateProviderBreakdown(metrics: DeliveryMetrics[]): ProviderPerformance[] {
    const providerGroups = this.groupBy(metrics, 'providerId');

    return Array.from(providerGroups.entries()).map(([providerId, providerMetrics]) => {
      const requests = providerMetrics.length;
      const successfulRequests = providerMetrics.filter(m => m.statusCode < 400).length;
      const cacheHits = providerMetrics.filter(m => m.cacheHit).length;

      return {
        providerId,
        providerName: this.getProviderName(providerId),
        requests,
        successRate: (successfulRequests / requests) * 100,
        averageLatency: Math.round(providerMetrics.reduce((sum, m) => sum + m.deliveryTime, 0) / requests),
        averageThroughput: Math.round(providerMetrics.reduce((sum, m) => sum + m.throughput, 0) / requests),
        cacheHitRate: (cacheHits / requests) * 100,
        costPerGB: this.getProviderCostPerGB(providerId),
        reliability: this.calculateReliability(providerMetrics),
        userRating: this.calculateUserRating(providerMetrics)
      };
    });
  }

  /**
   * Generate regional performance breakdown
   */
  private generateRegionalBreakdown(metrics: DeliveryMetrics[]): RegionalPerformance[] {
    const regionGroups = this.groupBy(metrics, 'region');

    return Array.from(regionGroups.entries()).map(([region, regionMetrics]) => {
      const requests = regionMetrics.length;
      const successfulRequests = regionMetrics.filter(m => m.statusCode < 400).length;
      const cacheHits = regionMetrics.filter(m => m.cacheHit).length;

      return {
        region,
        country: this.getCountryFromRegion(region),
        requests,
        averageLatency: Math.round(regionMetrics.reduce((sum, m) => sum + m.deliveryTime, 0) / requests),
        averageThroughput: Math.round(regionMetrics.reduce((sum, m) => sum + m.throughput, 0) / requests),
        errorRate: ((requests - successfulRequests) / requests) * 100,
        cacheHitRate: (cacheHits / requests) * 100,
        optimalProvider: this.findOptimalProviderForRegion(region, regionMetrics),
        performanceScore: this.calculateRegionalPerformanceScore(regionMetrics)
      };
    });
  }

  /**
   * Generate content type performance breakdown
   */
  private generateContentTypeBreakdown(metrics: DeliveryMetrics[]): ContentTypePerformance[] {
    // Group by content type (would need content type extraction from contentId)
    const contentTypeGroups = this.groupByContentType(metrics);

    return Array.from(contentTypeGroups.entries()).map(([contentType, typeMetrics]) => {
      const requests = typeMetrics.length;
      const totalSize = typeMetrics.reduce((sum, m) => sum + m.totalBytes, 0);

      return {
        contentType,
        requests,
        averageSize: Math.round(totalSize / requests),
        averageDeliveryTime: Math.round(typeMetrics.reduce((sum, m) => sum + m.deliveryTime, 0) / requests),
        averageThroughput: Math.round(typeMetrics.reduce((sum, m) => sum + m.throughput, 0) / requests),
        compressionRatio: this.calculateCompressionRatio(typeMetrics),
        optimalFormat: this.findOptimalFormat(contentType, typeMetrics),
        adaptationFrequency: this.calculateAdaptationFrequency(typeMetrics)
      };
    });
  }

  /**
   * Generate performance trends
   */
  private generateTrends(metrics: DeliveryMetrics[], timeRange: { start: Date; end: Date }): PerformanceTrends[] {
    const trends: PerformanceTrends[] = [];

    // Delivery time trend
    const deliveryTimeTrend = this.calculateTrend(metrics, 'deliveryTime', timeRange);
    if (deliveryTimeTrend) trends.push(deliveryTimeTrend);

    // Throughput trend
    const throughputTrend = this.calculateTrend(metrics, 'throughput', timeRange);
    if (throughputTrend) trends.push(throughputTrend);

    // Cache hit rate trend
    const cacheHitTrend = this.calculateTrend(metrics, 'cacheHitRate', timeRange);
    if (cacheHitTrend) trends.push(cacheHitTrend);

    // Error rate trend
    const errorRateTrend = this.calculateTrend(metrics, 'errorRate', timeRange);
    if (errorRateTrend) trends.push(errorRateTrend);

    return trends;
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrend(
    metrics: DeliveryMetrics[],
    metric: string,
    timeRange: { start: Date; end: Date }
  ): PerformanceTrends | null {
    // Group metrics by hour for trend analysis
    const hourlyData = this.groupMetricsByHour(metrics, timeRange);
    
    if (hourlyData.length < 2) return null;

    const dataPoints = hourlyData.map(hour => ({
      timestamp: hour.timestamp,
      value: this.calculateMetricValue(hour.metrics, metric)
    }));

    const trend = this.determineTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);

    return {
      metric,
      trend,
      changeRate,
      timePeriod: `${timeRange.start.toISOString()} - ${timeRange.end.toISOString()}`,
      dataPoints
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    summary: PerformanceSummary,
    providerBreakdown: ProviderPerformance[],
    regionalBreakdown: RegionalPerformance[]
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // High error rate recommendation
    if (summary.errorRate > 5) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'optimization',
        priority: summary.errorRate > 10 ? 'critical' : 'high',
        title: 'High Error Rate Detected',
        description: `Error rate is ${summary.errorRate.toFixed(2)}%, which exceeds acceptable thresholds.`,
        expectedImpact: 'Reduce failed requests and improve user experience',
        implementationEffort: 'medium',
        estimatedSavings: summary.errorRate * 1000, // Estimated savings in USD
        actionItems: [
          'Investigate failing requests and identify root causes',
          'Review CDN provider configurations',
          'Implement better error handling and retry mechanisms',
          'Consider failover to backup providers'
        ]
      });
    }

    // Low cache hit rate recommendation
    if (summary.cacheHitRate < 70) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'configuration',
        priority: 'medium',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${summary.cacheHitRate.toFixed(2)}%, below optimal performance.`,
        expectedImpact: 'Reduce latency and bandwidth costs',
        implementationEffort: 'low',
        actionItems: [
          'Review and optimize cache control headers',
          'Increase cache TTL for static content',
          'Implement cache warming strategies',
          'Consider edge caching for dynamic content'
        ]
      });
    }

    // Slow delivery time recommendation
    if (summary.averageDeliveryTime > 3000) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'optimization',
        priority: 'high',
        title: 'Slow Delivery Times',
        description: `Average delivery time is ${summary.averageDeliveryTime}ms, exceeding performance targets.`,
        expectedImpact: 'Improve user experience and engagement',
        implementationEffort: 'medium',
        actionItems: [
          'Optimize content compression and formats',
          'Implement adaptive bitrate streaming',
          'Review CDN provider performance',
          'Consider edge computing for content processing'
        ]
      });
    }

    // Provider-specific recommendations
    const worstProvider = providerBreakdown.reduce((worst, current) => 
      current.averageLatency > worst.averageLatency ? current : worst
    );

    if (worstProvider.averageLatency > 5000) {
      recommendations.push({
        id: this.generateRecommendationId(),
        type: 'configuration',
        priority: 'medium',
        title: `Underperforming Provider: ${worstProvider.providerName}`,
        description: `${worstProvider.providerName} shows high latency of ${worstProvider.averageLatency}ms.`,
        expectedImpact: 'Improve overall delivery performance',
        implementationEffort: 'low',
        actionItems: [
          'Review provider configuration and settings',
          'Consider reducing traffic to this provider',
          'Evaluate alternative providers for better performance',
          'Implement provider-specific optimizations'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Start metrics aggregation
   */
  private startMetricsAggregation(): void {
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, 60000); // Every minute

    logger.info('Started metrics aggregation');
  }

  /**
   * Aggregate metrics for performance analysis
   */
  private aggregateMetrics(): void {
    try {
      // Generate hourly aggregates
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
      
      if (recentMetrics.length > 0) {
        const aggregates = this.calculateHourlyAggregates(recentMetrics);
        this.eventEmitter.emit('metrics:aggregated', aggregates);
      }
    } catch (error) {
      logger.error('Error aggregating metrics:', error);
    }
  }

  /**
   * Start real-time monitoring
   */
  private startRealTimeMonitoring(): void {
    this.alertingInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 30000); // Every 30 seconds

    logger.info('Started real-time monitoring');
  }

  /**
   * Check overall system health
   */
  private checkSystemHealth(): void {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const recentMetrics = this.metrics.filter(m => m.timestamp >= fiveMinutesAgo);
      
      if (recentMetrics.length === 0) {
        // No recent metrics - could indicate system issue
        this.generateSystemAlert('No recent metrics received', 'warning');
      }

      // Check for systemic issues
      const errorRate = (recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length) * 100;
      if (errorRate > 15) {
        this.generateSystemAlert(`High system error rate: ${errorRate.toFixed(2)}%`, 'error');
      }
    } catch (error) {
      logger.error('Error checking system health:', error);
    }
  }

  /**
   * Generate system-level alert
   */
  private generateSystemAlert(message: string, severity: 'warning' | 'error' | 'critical'): void {
    const alert: RealTimeAlert = {
      id: this.generateAlertId(),
      type: 'performance',
      severity,
      title: 'System Health Alert',
      description: message,
      timestamp: new Date(),
      affectedResources: ['system'],
      metrics: {},
      resolved: false
    };

    this.alerts.set(alert.id, alert);
    this.eventEmitter.emit('alert:generated', alert);
  }

  // Helper methods
  private groupBy<T>(array: T[], key: keyof T): Map<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key]);
      const group = groups.get(groupKey) || [];
      group.push(item);
      groups.set(groupKey, group);
      return groups;
    }, new Map());
  }

  private groupByContentType(metrics: DeliveryMetrics[]): Map<string, DeliveryMetrics[]> {
    // Simplified content type grouping - in real implementation would extract from content
    const groups = new Map<string, DeliveryMetrics[]>();
    
    metrics.forEach(metric => {
      const contentType = this.inferContentTypeFromContentId(metric.contentId);
      const group = groups.get(contentType) || [];
      group.push(metric);
      groups.set(contentType, group);
    });

    return groups;
  }

  private inferContentTypeFromContentId(contentId: string): string {
    if (contentId.includes('video')) return 'video';
    if (contentId.includes('image')) return 'image';
    if (contentId.includes('audio')) return 'audio';
    if (contentId.includes('document')) return 'document';
    return 'other';
  }

  private groupMetricsByHour(metrics: DeliveryMetrics[], timeRange: { start: Date; end: Date }): any[] {
    const hourlyGroups = new Map<number, DeliveryMetrics[]>();
    
    metrics.forEach(metric => {
      const hour = metric.timestamp.getHours();
      const group = hourlyGroups.get(hour) || [];
      group.push(metric);
      hourlyGroups.set(hour, group);
    });

    return Array.from(hourlyGroups.entries()).map(([hour, hourMetrics]) => ({
      timestamp: new Date(timeRange.start.getFullYear(), timeRange.start.getMonth(), timeRange.start.getDate(), hour),
      metrics: hourMetrics
    }));
  }

  private calculateMetricValue(metrics: DeliveryMetrics[], metric: string): number {
    switch (metric) {
      case 'deliveryTime':
        return metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / metrics.length;
      case 'throughput':
        return metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
      case 'cacheHitRate':
        return (metrics.filter(m => m.cacheHit).length / metrics.length) * 100;
      case 'errorRate':
        return (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100;
      default:
        return 0;
    }
  }

  private determineTrendDirection(dataPoints: TrendDataPoint[]): 'improving' | 'stable' | 'degrading' {
    if (dataPoints.length < 2) return 'stable';

    const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
    const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

    const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (Math.abs(change) < 0.05) return 'stable';
    return change > 0 ? 'degrading' : 'improving';
  }

  private calculateChangeRate(dataPoints: TrendDataPoint[]): number {
    if (dataPoints.length < 2) return 0;

    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;

    return ((last - first) / first) * 100;
  }

  // Placeholder methods for calculations
  private getProviderName(providerId: string): string {
    const names: Record<string, string> = {
      'cloudflare': 'Cloudflare CDN',
      'fastly': 'Fastly CDN',
      'akamai': 'Akamai CDN',
      'aws-cloudfront': 'AWS CloudFront'
    };
    return names[providerId] || providerId;
  }

  private getProviderCostPerGB(providerId: string): number {
    const costs: Record<string, number> = {
      'cloudflare': 0.09,
      'fastly': 0.12,
      'akamai': 0.15,
      'aws-cloudfront': 0.17
    };
    return costs[providerId] || 0.10;
  }

  private calculateCostEfficiency(metrics: DeliveryMetrics[]): number {
    // Simplified calculation
    return 85 + Math.random() * 10; // 85-95%
  }

  private calculateUserSatisfaction(metrics: DeliveryMetrics[]): number {
    // Based on delivery time and error rate
    const avgDeliveryTime = metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / metrics.length;
    const errorRate = (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100;
    
    let satisfaction = 100;
    if (avgDeliveryTime > 3000) satisfaction -= 20;
    if (avgDeliveryTime > 5000) satisfaction -= 30;
    if (errorRate > 5) satisfaction -= 15;
    if (errorRate > 10) satisfaction -= 25;
    
    return Math.max(0, satisfaction);
  }

  private calculateReliability(providerMetrics: DeliveryMetrics[]): number {
    const successRate = (providerMetrics.filter(m => m.statusCode < 400).length / providerMetrics.length) * 100;
    return successRate;
  }

  private calculateUserRating(providerMetrics: DeliveryMetrics[]): number {
    const avgLatency = providerMetrics.reduce((sum, m) => sum + m.deliveryTime, 0) / providerMetrics.length;
    let rating = 5;
    if (avgLatency > 1000) rating -= 1;
    if (avgLatency > 3000) rating -= 1;
    if (avgLatency > 5000) rating -= 1;
    return Math.max(1, rating);
  }

  private getCountryFromRegion(region: string): string {
    // Simplified mapping
    const countries: Record<string, string> = {
      'us-east': 'United States',
      'us-west': 'United States',
      'eu-west': 'United Kingdom',
      'eu-central': 'Germany',
      'asia-east': 'Singapore',
      'asia-southeast': 'Singapore'
    };
    return countries[region] || 'Unknown';
  }

  private findOptimalProviderForRegion(region: string, regionMetrics: DeliveryMetrics[]): string {
    const providerGroups = this.groupBy(regionMetrics, 'providerId');
    let bestProvider = '';
    let bestLatency = Infinity;

    providerGroups.forEach((metrics, providerId) => {
      const avgLatency = metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / metrics.length;
      if (avgLatency < bestLatency) {
        bestLatency = avgLatency;
        bestProvider = providerId;
      }
    });

    return bestProvider;
  }

  private calculateRegionalPerformanceScore(regionMetrics: DeliveryMetrics[]): number {
    const avgLatency = regionMetrics.reduce((sum, m) => sum + m.deliveryTime, 0) / regionMetrics.length;
    const errorRate = (regionMetrics.filter(m => m.statusCode >= 400).length / regionMetrics.length) * 100;
    
    let score = 100;
    if (avgLatency > 1000) score -= 20;
    if (avgLatency > 3000) score -= 30;
    if (errorRate > 5) score -= 25;
    if (errorRate > 10) score -= 35;
    
    return Math.max(0, score);
  }

  private calculateCompressionRatio(metrics: DeliveryMetrics[]): number {
    // Simplified - would need original vs compressed size
    return 0.7 + Math.random() * 0.2; // 70-90%
  }

  private findOptimalFormat(contentType: string, metrics: DeliveryMetrics[]): string {
    // Simplified format recommendation
    switch (contentType) {
      case 'image': return 'webp';
      case 'video': return 'mp4';
      case 'audio': return 'mp3';
      default: return 'original';
    }
  }

  private calculateAdaptationFrequency(metrics: DeliveryMetrics[]): number {
    // Simplified - would track actual adaptations
    return Math.random() * 20; // 0-20%
  }

  private calculateHourlyAggregates(metrics: DeliveryMetrics[]): any {
    return {
      timestamp: new Date(),
      requestCount: metrics.length,
      averageLatency: metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / metrics.length,
      errorRate: (metrics.filter(m => m.statusCode >= 400).length / metrics.length) * 100,
      cacheHitRate: (metrics.filter(m => m.cacheHit).length / metrics.length) * 100
    };
  }

  // ID generators
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getReport(reportId: string): PerformanceReport | null {
    return this.reports.get(reportId) || null;
  }

  getReports(): PerformanceReport[] {
    return Array.from(this.reports.values());
  }

  getActiveAlerts(): RealTimeAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.eventEmitter.emit('alert:resolved', alert);
    }
  }

  getMetrics(timeRange?: { start: Date; end: Date }): DeliveryMetrics[] {
    if (!timeRange) return this.metrics;
    
    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getPerformanceStatistics(): {
    totalMetrics: number;
    activeAlerts: number;
    reportsGenerated: number;
    averageLatency: number;
    errorRate: number;
  } {
    const totalMetrics = this.metrics.length;
    const activeAlerts = this.getActiveAlerts().length;
    const reportsGenerated = this.reports.size;
    
    const averageLatency = totalMetrics > 0 
      ? this.metrics.reduce((sum, m) => sum + m.deliveryTime, 0) / totalMetrics 
      : 0;
    
    const errorRate = totalMetrics > 0 
      ? (this.metrics.filter(m => m.statusCode >= 400).length / totalMetrics) * 100 
      : 0;

    return {
      totalMetrics,
      activeAlerts,
      reportsGenerated,
      averageLatency: Math.round(averageLatency),
      errorRate
    };
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.alertingInterval) {
      clearInterval(this.alertingInterval);
    }

    this.eventEmitter.removeAllListeners();
    logger.info('Delivery analytics service destroyed');
  }
}
