/**
 * Multi-CDN Routing and Failover Service
 * Handles intelligent CDN selection, health monitoring, and failover logic
 */

import axios, { AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import {
  CDNProvider,
  CDNEndpoint,
  CDNHealthCheck,
  CDNRoutingRule,
  CDNSelectionResult,
  CDNMetrics,
  ContentDeliveryRequest,
  ClientInfo,
  DeliveryOptimizationResult,
  QualityLevel
} from './types';

export class MultiCDNService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private providers: Map<string, CDNProvider> = new Map();
  private routingRules: Map<string, CDNRoutingRule> = new Map();
  private healthChecks: Map<string, CDNHealthCheck[]> = new Map();
  private metrics: Map<string, CDNMetrics[]> = new Map();
  private healthCheckInterval?: any;
  private metricsInterval?: any;

  constructor() {
    this.initializeProviders();
    this.initializeRoutingRules();
    this.startHealthMonitoring();
    this.startMetricsCollection();
  }

  /**
   * Initialize CDN providers with configuration
   */
  private initializeProviders(): void {
    const providers: CDNProvider[] = [
      {
        id: 'cloudflare',
        name: 'Cloudflare CDN',
        priority: 1,
        regions: ['global'],
        endpoints: [
          {
            url: 'https://cdn.cloudflare.com',
            region: 'global',
            priority: 1,
            isHealthy: true,
            lastHealthCheck: new Date(),
            latency: 50
          }
        ],
        healthCheckUrl: 'https://cdn.cloudflare.com/health',
        isActive: true,
        latency: 50,
        bandwidth: 10000,
        reliability: 0.999,
        costPerGB: 0.09
      },
      {
        id: 'fastly',
        name: 'Fastly CDN',
        priority: 2,
        regions: ['global'],
        endpoints: [
          {
            url: 'https://fastly.net',
            region: 'global',
            priority: 1,
            isHealthy: true,
            lastHealthCheck: new Date(),
            latency: 60
          }
        ],
        healthCheckUrl: 'https://fastly.net/health',
        isActive: true,
        latency: 60,
        bandwidth: 8000,
        reliability: 0.998,
        costPerGB: 0.12
      },
      {
        id: 'akamai',
        name: 'Akamai CDN',
        priority: 3,
        regions: ['global'],
        endpoints: [
          {
            url: 'https://akamai.net',
            region: 'global',
            priority: 1,
            isHealthy: true,
            lastHealthCheck: new Date(),
            latency: 70
          }
        ],
        healthCheckUrl: 'https://akamai.net/health',
        isActive: true,
        latency: 70,
        bandwidth: 12000,
        reliability: 0.997,
        costPerGB: 0.15
      },
      {
        id: 'aws-cloudfront',
        name: 'AWS CloudFront',
        priority: 4,
        regions: ['global'],
        endpoints: [
          {
            url: 'https://cloudfront.net',
            region: 'global',
            priority: 1,
            isHealthy: true,
            lastHealthCheck: new Date(),
            latency: 80
          }
        ],
        healthCheckUrl: 'https://cloudfront.net/health',
        isActive: true,
        latency: 80,
        bandwidth: 9000,
        reliability: 0.996,
        costPerGB: 0.17
      }
    ];

    providers.forEach(provider => {
      this.providers.set(provider.id, provider);
      this.healthChecks.set(provider.id, []);
    });

    logger.info(`Initialized ${providers.length} CDN providers`);
  }

  /**
   * Initialize routing rules for intelligent selection
   */
  private initializeRoutingRules(): void {
    const rules: CDNRoutingRule[] = [
      {
        id: 'geo-routing',
        name: 'Geographic Routing',
        conditions: [
          {
            type: 'geo',
            operator: 'in',
            value: ['US', 'CA', 'EU'],
            weight: 0.4
          }
        ],
        actions: [
          {
            type: 'select_provider',
            parameters: { preferred: ['cloudflare', 'fastly'] }
          }
        ],
        priority: 1,
        isActive: true
      },
      {
        id: 'mobile-optimization',
        name: 'Mobile Optimization',
        conditions: [
          {
            type: 'device',
            operator: 'equals',
            value: 'mobile',
            weight: 0.3
          }
        ],
        actions: [
          {
            type: 'select_provider',
            parameters: { preferred: ['cloudflare'] }
          },
          {
            type: 'compress',
            parameters: { level: 'high' }
          }
        ],
        priority: 2,
        isActive: true
      },
      {
        id: 'high-bandwidth-content',
        name: 'High Bandwidth Content',
        conditions: [
          {
            type: 'content_type',
            operator: 'contains',
            value: 'video',
            weight: 0.5
          }
        ],
        actions: [
          {
            type: 'select_provider',
            parameters: { preferred: ['akamai', 'aws-cloudfront'] }
          }
        ],
        priority: 3,
        isActive: true
      },
      {
        id: 'cost-optimization',
        name: 'Cost Optimization',
        conditions: [
          {
            type: 'network',
            operator: 'equals',
            value: 'wifi',
            weight: 0.2
          }
        ],
        actions: [
          {
            type: 'select_provider',
            parameters: { maxCostPerGB: 0.10 }
          }
        ],
        priority: 4,
        isActive: true
      }
    ];

    rules.forEach(rule => {
      this.routingRules.set(rule.id, rule);
    });

    logger.info(`Initialized ${rules.length} routing rules`);
  }

  /**
   * Select optimal CDN provider and endpoint for content delivery
   */
  async selectOptimalCDN(request: ContentDeliveryRequest): Promise<CDNSelectionResult> {
    try {
      const activeProviders = Array.from(this.providers.values())
        .filter(provider => provider.isActive && this.isProviderHealthy(provider));

      if (activeProviders.length === 0) {
        throw new Error('No healthy CDN providers available');
      }

      // Apply routing rules
      const matchingRules = this.findMatchingRules(request);
      const preferredProviders = this.getPreferredProviders(matchingRules, activeProviders);

      // Score and rank providers
      const scoredProviders = await this.scoreProviders(preferredProviders, request);
      const selectedProvider = scoredProviders[0];

      // Select best endpoint for the provider
      const selectedEndpoint = this.selectBestEndpoint(selectedProvider, request.clientInfo);

      // Get fallback providers
      const fallbackProviders = scoredProviders.slice(1, 3);

      const result: CDNSelectionResult = {
        provider: selectedProvider,
        endpoint: selectedEndpoint,
        fallbackProviders,
        routingReason: this.getRoutingReason(matchingRules),
        estimatedLatency: selectedEndpoint.latency,
        estimatedBandwidth: selectedProvider.bandwidth
      };

      logger.info(`Selected CDN: ${selectedProvider.name} for content ${request.contentId}`);
      this.eventEmitter.emit('cdn:selected', result);

      return result;
    } catch (error) {
      logger.error('Error selecting optimal CDN:', error);
      throw error;
    }
  }

  /**
   * Find routing rules that match the request
   */
  private findMatchingRules(request: ContentDeliveryRequest): CDNRoutingRule[] {
    return Array.from(this.routingRules.values())
      .filter(rule => rule.isActive && this.evaluateRuleConditions(rule.conditions, request))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate if rule conditions match the request
   */
  private evaluateRuleConditions(conditions: any[], request: ContentDeliveryRequest): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'geo':
          return this.evaluateGeoCondition(condition, request.clientInfo);
        case 'device':
          return this.evaluateDeviceCondition(condition, request.clientInfo);
        case 'content_type':
          return this.evaluateContentTypeCondition(condition, request);
        case 'network':
          return this.evaluateNetworkCondition(condition, request.clientInfo);
        default:
          return false;
      }
    });
  }

  /**
   * Evaluate geographic condition
   */
  private evaluateGeoCondition(condition: any, clientInfo: ClientInfo): boolean {
    if (!clientInfo.country) return false;
    
    switch (condition.operator) {
      case 'in':
        return (condition.value as string[]).includes(clientInfo.country);
      case 'equals':
        return condition.value === clientInfo.country;
      default:
        return false;
    }
  }

  /**
   * Evaluate device condition
   */
  private evaluateDeviceCondition(condition: any, clientInfo: ClientInfo): boolean {
    switch (condition.operator) {
      case 'equals':
        return condition.value === clientInfo.deviceType;
      default:
        return false;
    }
  }

  /**
   * Evaluate content type condition
   */
  private evaluateContentTypeCondition(condition: any, request: ContentDeliveryRequest): boolean {
    switch (condition.operator) {
      case 'contains':
        return request.contentType.includes(condition.value);
      case 'equals':
        return request.contentType === condition.value;
      default:
        return false;
    }
  }

  /**
   * Evaluate network condition
   */
  private evaluateNetworkCondition(condition: any, clientInfo: ClientInfo): boolean {
    switch (condition.operator) {
      case 'equals':
        return condition.value === clientInfo.connectionType;
      default:
        return false;
    }
  }

  /**
   * Get preferred providers based on routing rules
   */
  private getPreferredProviders(rules: CDNRoutingRule[], availableProviders: CDNProvider[]): CDNProvider[] {
    if (rules.length === 0) {
      return availableProviders;
    }

    const preferredProviderIds = new Set<string>();
    
    rules.forEach(rule => {
      rule.actions.forEach(action => {
        if (action.type === 'select_provider') {
          const preferred = action.parameters.preferred || [];
          preferred.forEach((id: string) => preferredProviderIds.add(id));
        }
      });
    });

    // Filter available providers by preferred ones, then by priority
    const preferred = availableProviders.filter(p => preferredProviderIds.has(p.id));
    const others = availableProviders.filter(p => !preferredProviderIds.has(p.id));

    return [...preferred.sort((a, b) => a.priority - b.priority), 
            ...others.sort((a, b) => a.priority - b.priority)];
  }

  /**
   * Score providers based on various factors
   */
  private async scoreProviders(providers: CDNProvider[], request: ContentDeliveryRequest): Promise<CDNProvider[]> {
    const scored = await Promise.all(
      providers.map(async provider => {
        let score = 0;

        // Latency score (lower is better)
        score += (100 - provider.latency) * 0.3;

        // Reliability score
        score += provider.reliability * 100 * 0.25;

        // Bandwidth score
        score += Math.min(provider.bandwidth / 100, 100) * 0.2;

        // Cost score (lower cost is better)
        score += (1 - provider.costPerGB) * 100 * 0.15;

        // Health check score
        const healthScore = this.getProviderHealthScore(provider);
        score += healthScore * 0.1;

        return { provider, score };
      })
    );

    return scored
      .sort((a, b) => b.score - a.score)
      .map(item => item.provider);
  }

  /**
   * Select best endpoint for a provider
   */
  private selectBestEndpoint(provider: CDNProvider, clientInfo: ClientInfo): CDNEndpoint {
    const healthyEndpoints = provider.endpoints.filter(endpoint => endpoint.isHealthy);
    
    if (healthyEndpoints.length === 0) {
      // Return least unhealthy endpoint as fallback
      return provider.endpoints.reduce((best, current) => 
        current.latency < best.latency ? current : best
      );
    }

    // Select endpoint with lowest latency
    return healthyEndpoints.reduce((best, current) => 
      current.latency < best.latency ? current : best
    );
  }

  /**
   * Get routing reason for logging
   */
  private getRoutingReason(rules: CDNRoutingRule[]): string {
    if (rules.length === 0) return 'default_routing';
    return rules.map(rule => rule.name).join(', ');
  }

  /**
   * Check if provider is healthy
   */
  private isProviderHealthy(provider: CDNProvider): boolean {
    const healthChecks = this.healthChecks.get(provider.id) || [];
    const recentChecks = healthChecks.filter(check => 
      Date.now() - check.timestamp.getTime() < 5 * 60 * 1000 // Last 5 minutes
    );

    if (recentChecks.length === 0) return true; // Assume healthy if no recent checks

    const healthyCount = recentChecks.filter(check => check.status === 'healthy').length;
    return healthyCount / recentChecks.length > 0.5; // At least 50% healthy
  }

  /**
   * Get provider health score
   */
  private getProviderHealthScore(provider: CDNProvider): number {
    const healthChecks = this.healthChecks.get(provider.id) || [];
    const recentChecks = healthChecks.filter(check => 
      Date.now() - check.timestamp.getTime() < 10 * 60 * 1000 // Last 10 minutes
    );

    if (recentChecks.length === 0) return 100;

    const healthyCount = recentChecks.filter(check => check.status === 'healthy').length;
    return (healthyCount / recentChecks.length) * 100;
  }

  /**
   * Start health monitoring for all providers
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30 * 1000); // Every 30 seconds

    logger.info('Started CDN health monitoring');
  }

  /**
   * Perform health checks on all providers
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(provider => 
      this.checkProviderHealth(provider)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Check individual provider health
   */
  private async checkProviderHealth(provider: CDNProvider): Promise<void> {
    try {
      const startTime = Date.now();
      const response: AxiosResponse = await axios.get(provider.healthCheckUrl, {
        timeout: 5000,
        validateStatus: (status: number) => status < 500
      });
      const latency = Date.now() - startTime;

      const healthCheck: CDNHealthCheck = {
        providerId: provider.id,
        endpoint: provider.healthCheckUrl,
        status: response.status < 400 ? 'healthy' : 'unhealthy',
        latency,
        timestamp: new Date()
      };

      // Update provider endpoints
      provider.endpoints.forEach(endpoint => {
        endpoint.isHealthy = healthCheck.status === 'healthy';
        endpoint.latency = latency;
        endpoint.lastHealthCheck = healthCheck.timestamp;
      });

      // Store health check
      const checks = this.healthChecks.get(provider.id) || [];
      checks.push(healthCheck);
      
      // Keep only last 100 checks
      if (checks.length > 100) {
        checks.splice(0, checks.length - 100);
      }
      
      this.healthChecks.set(provider.id, checks);

      this.eventEmitter.emit('health:check', healthCheck);
    } catch (error) {
      const healthCheck: CDNHealthCheck = {
        providerId: provider.id,
        endpoint: provider.healthCheckUrl,
        status: 'unhealthy',
        latency: 5000,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      // Update provider endpoints
      provider.endpoints.forEach(endpoint => {
        endpoint.isHealthy = false;
        endpoint.lastHealthCheck = healthCheck.timestamp;
      });

      const checks = this.healthChecks.get(provider.id) || [];
      checks.push(healthCheck);
      this.healthChecks.set(provider.id, checks);

      this.eventEmitter.emit('health:check', healthCheck);
      logger.warn(`Health check failed for ${provider.name}:`, error);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 60 * 1000); // Every minute

    logger.info('Started CDN metrics collection');
  }

  /**
   * Collect CDN metrics
   */
  private collectMetrics(): void {
    // In a real implementation, this would collect actual usage metrics
    // For now, generate sample metrics
    this.providers.forEach(provider => {
      const metrics: CDNMetrics = {
        providerId: provider.id,
        region: 'global',
        timestamp: new Date(),
        requests: Math.floor(Math.random() * 10000),
        bytesTransferred: Math.floor(Math.random() * 1000000000),
        averageLatency: provider.latency + Math.random() * 20 - 10,
        errorRate: Math.random() * 0.01,
        cacheHitRate: 0.8 + Math.random() * 0.15,
        cost: 0
      };

      metrics.cost = metrics.bytesTransferred / (1024 * 1024 * 1024) * provider.costPerGB;

      const providerMetrics = this.metrics.get(provider.id) || [];
      providerMetrics.push(metrics);
      
      // Keep only last 1000 metrics
      if (providerMetrics.length > 1000) {
        providerMetrics.splice(0, providerMetrics.length - 1000);
      }
      
      this.metrics.set(provider.id, providerMetrics);
    });
  }

  /**
   * Get provider metrics
   */
  getProviderMetrics(providerId: string, timeRange?: { start: Date; end: Date }): CDNMetrics[] {
    const metrics = this.metrics.get(providerId) || [];
    
    if (!timeRange) {
      return metrics;
    }

    return metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  /**
   * Get all providers
   */
  getProviders(): CDNProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get health status
   */
  getHealthStatus(): Map<string, CDNHealthCheck[]> {
    return new Map(this.healthChecks);
  }

  /**
   * Add custom routing rule
   */
  addRoutingRule(rule: CDNRoutingRule): void {
    this.routingRules.set(rule.id, rule);
    logger.info(`Added routing rule: ${rule.name}`);
  }

  /**
   * Remove routing rule
   */
  removeRoutingRule(ruleId: string): boolean {
    const removed = this.routingRules.delete(ruleId);
    if (removed) {
      logger.info(`Removed routing rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Update provider configuration
   */
  updateProvider(provider: CDNProvider): void {
    this.providers.set(provider.id, provider);
    logger.info(`Updated provider: ${provider.name}`);
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.eventEmitter.removeAllListeners();
    logger.info('MultiCDN service destroyed');
  }
}
