/**
 * Network Condition Detection and Adaptation Service
 * Real-time network monitoring and content adaptation based on network conditions
 */

import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import geoip from 'geoip-lite';

export interface NetworkMetrics {
  bandwidth: number; // in kbps
  latency: number; // in ms
  jitter: number; // in ms
  packetLoss: number; // percentage 0-100
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
  timestamp: Date;
}

export interface ClientNetworkInfo {
  ip: string;
  userAgent: string;
  connectionType: string;
  effectiveBandwidth?: number;
  rtt?: number;
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

export interface NetworkTestResult {
  downloadSpeed: number; // in kbps
  uploadSpeed: number; // in kbps
  latency: number; // in ms
  jitter: number; // in ms
  packetLoss: number; // percentage
  testDuration: number; // in ms
  server: string;
}

export interface AdaptationStrategy {
  id: string;
  name: string;
  conditions: AdaptationCondition[];
  actions: AdaptationAction[];
  priority: number;
  isActive: boolean;
}

export interface AdaptationCondition {
  type: 'bandwidth' | 'latency' | 'packet_loss' | 'connection_type' | 'device_memory';
  operator: 'less_than' | 'greater_than' | 'equals' | 'between';
  value: number | string | [number, number];
  weight: number;
}

export interface AdaptationAction {
  type: 'reduce_quality' | 'compress_more' | 'switch_protocol' | 'preload_content' | 'cache_aggressively';
  parameters: Record<string, any>;
}

export interface ContentAdaptation {
  contentId: string;
  originalQuality: string;
  adaptedQuality: string;
  adaptationReason: string;
  networkConditions: NetworkMetrics;
  appliedActions: AdaptationAction[];
  timestamp: Date;
}

export class NetworkDetectionService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private adaptationStrategies: Map<string, AdaptationStrategy> = new Map();
  private networkHistory: Map<string, NetworkMetrics[]> = new Map();
  private adaptationHistory: Map<string, ContentAdaptation[]> = new Map();
  private networkTestServers: string[] = [];

  constructor() {
    this.initializeTestServers();
    this.initializeAdaptationStrategies();
    this.startNetworkMonitoring();
  }

  /**
   * Initialize network test servers
   */
  private initializeTestServers(): void {
    this.networkTestServers = [
      'https://speed.cloudflare.com/__down?bytes=1048576', // 1MB test
      'https://speed.cloudflare.com/__down?bytes=10485760', // 10MB test
      'https://httpbin.org/delay/0', // Latency test
      'https://httpbin.org/status/200' // Simple connectivity test
    ];

    logger.info(`Initialized ${this.networkTestServers.length} network test servers`);
  }

  /**
   * Initialize adaptation strategies
   */
  private initializeAdaptationStrategies(): void {
    const strategies: AdaptationStrategy[] = [
      {
        id: 'low-bandwidth-adaptation',
        name: 'Low Bandwidth Adaptation',
        conditions: [
          {
            type: 'bandwidth',
            operator: 'less_than',
            value: 1500, // 1.5 Mbps
            weight: 0.8
          }
        ],
        actions: [
          {
            type: 'reduce_quality',
            parameters: { targetQuality: '360p', compressionLevel: 'high' }
          },
          {
            type: 'compress_more',
            parameters: { level: 'maximum' }
          },
          {
            type: 'switch_protocol',
            parameters: { protocol: 'hls', segmentDuration: 10 }
          }
        ],
        priority: 1,
        isActive: true
      },
      {
        id: 'high-latency-adaptation',
        name: 'High Latency Adaptation',
        conditions: [
          {
            type: 'latency',
            operator: 'greater_than',
            value: 200, // 200ms
            weight: 0.6
          }
        ],
        actions: [
          {
            type: 'preload_content',
            parameters: { bufferSize: 30, aggressive: true }
          },
          {
            type: 'cache_aggressively',
            parameters: { ttl: 3600, strategy: 'cache-first' }
          }
        ],
        priority: 2,
        isActive: true
      },
      {
        id: 'packet-loss-adaptation',
        name: 'Packet Loss Adaptation',
        conditions: [
          {
            type: 'packet_loss',
            operator: 'greater_than',
            value: 3, // 3%
            weight: 0.9
          }
        ],
        actions: [
          {
            type: 'reduce_quality',
            parameters: { targetQuality: '240p', redundancy: true }
          },
          {
            type: 'switch_protocol',
            parameters: { protocol: 'hls', segmentDuration: 15 }
          }
        ],
        priority: 3,
        isActive: true
      },
      {
        id: 'mobile-data-saver',
        name: 'Mobile Data Saver',
        conditions: [
          {
            type: 'connection_type',
            operator: 'equals',
            value: 'cellular',
            weight: 0.5
          },
          {
            type: 'bandwidth',
            operator: 'less_than',
            value: 3000, // 3 Mbps
            weight: 0.7
          }
        ],
        actions: [
          {
            type: 'compress_more',
            parameters: { level: 'maximum', format: 'webp' }
          },
          {
            type: 'reduce_quality',
            parameters: { targetQuality: '480p' }
          }
        ],
        priority: 4,
        isActive: true
      },
      {
        id: 'premium-network',
        name: 'Premium Network Optimization',
        conditions: [
          {
            type: 'bandwidth',
            operator: 'greater_than',
            value: 10000, // 10 Mbps
            weight: 0.4
          },
          {
            type: 'latency',
            operator: 'less_than',
            value: 50, // 50ms
            weight: 0.3
          }
        ],
        actions: [
          {
            type: 'reduce_quality',
            parameters: { targetQuality: '1080p', enhance: true }
          },
          {
            type: 'preload_content',
            parameters: { bufferSize: 60, predictive: true }
          }
        ],
        priority: 5,
        isActive: true
      }
    ];

    strategies.forEach(strategy => {
      this.adaptationStrategies.set(strategy.id, strategy);
    });

    logger.info(`Initialized ${strategies.length} adaptation strategies`);
  }

  /**
   * Start continuous network monitoring
   */
  private startNetworkMonitoring(): void {
    setInterval(() => {
      this.performNetworkHealthCheck();
    }, 30000); // Every 30 seconds

    logger.info('Started network monitoring service');
  }

  /**
   * Detect network conditions for a client
   */
  async detectNetworkConditions(clientInfo: ClientNetworkInfo): Promise<NetworkMetrics> {
    try {
      logger.info(`Detecting network conditions for client: ${clientInfo.ip}`);

      // Perform network tests
      const testResult = await this.performNetworkTest(clientInfo);
      
      // Get geographic and ISP information
      const geoData = geoip.lookup(clientInfo.ip);
      
      // Analyze user agent for device capabilities
      const deviceCapabilities = this.analyzeUserAgent(clientInfo.userAgent);
      
      // Calculate network quality
      const networkQuality = this.calculateNetworkQuality(testResult, clientInfo);

      const metrics: NetworkMetrics = {
        bandwidth: testResult.downloadSpeed,
        latency: testResult.latency,
        jitter: testResult.jitter,
        packetLoss: testResult.packetLoss,
        connectionType: this.determineConnectionType(clientInfo, testResult),
        networkQuality,
        timestamp: new Date()
      };

      // Store metrics in history
      this.storeNetworkMetrics(clientInfo.ip, metrics);

      logger.info(`Network conditions detected: ${JSON.stringify(metrics)}`);
      this.eventEmitter.emit('network:detected', { clientInfo, metrics });

      return metrics;
    } catch (error) {
      logger.error('Error detecting network conditions:', error);
      
      // Return default metrics on error
      return this.getDefaultNetworkMetrics(clientInfo);
    }
  }

  /**
   * Perform comprehensive network test
   */
  private async performNetworkTest(clientInfo: ClientNetworkInfo): Promise<NetworkTestResult> {
    const startTime = Date.now();
    
    try {
      // Test download speed
      const downloadSpeed = await this.testDownloadSpeed();
      
      // Test latency
      const latency = await this.testLatency();
      
      // Test jitter (multiple latency measurements)
      const jitter = await this.testJitter();
      
      // Test packet loss (simplified - would need more complex implementation)
      const packetLoss = await this.testPacketLoss();

      const result: NetworkTestResult = {
        downloadSpeed,
        uploadSpeed: downloadSpeed * 0.1, // Estimate as 10% of download
        latency,
        jitter,
        packetLoss,
        testDuration: Date.now() - startTime,
        server: this.networkTestServers[0]
      };

      return result;
    } catch (error) {
      logger.error('Network test failed:', error);
      
      // Return estimated values based on connection type
      return this.estimateNetworkMetrics(clientInfo);
    }
  }

  /**
   * Test download speed
   */
  private async testDownloadSpeed(): Promise<number> {
    try {
      // Use a simple fetch test (in a real implementation, would use more sophisticated testing)
      const testUrl = this.networkTestServers[0];
      const startTime = Date.now();
      
      // Simulate network test - in real implementation would make actual HTTP requests
      const simulatedSpeed = 5000 + Math.random() * 10000; // 5-15 Mbps
      
      return simulatedSpeed;
    } catch (error) {
      logger.warn('Download speed test failed:', error);
      return 5000; // Default 5 Mbps
    }
  }

  /**
   * Test latency
   */
  private async testLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      
      // Simulate latency test
      const simulatedLatency = 30 + Math.random() * 100; // 30-130ms
      
      return simulatedLatency;
    } catch (error) {
      logger.warn('Latency test failed:', error);
      return 80; // Default 80ms
    }
  }

  /**
   * Test jitter (variation in latency)
   */
  private async testJitter(): Promise<number> {
    try {
      const latencies: number[] = [];
      
      // Take multiple latency measurements
      for (let i = 0; i < 5; i++) {
        const latency = await this.testLatency();
        latencies.push(latency);
      }
      
      // Calculate jitter as standard deviation
      const mean = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - mean, 2), 0) / latencies.length;
      const jitter = Math.sqrt(variance);
      
      return Math.round(jitter);
    } catch (error) {
      logger.warn('Jitter test failed:', error);
      return 10; // Default 10ms
    }
  }

  /**
   * Test packet loss
   */
  private async testPacketLoss(): Promise<number> {
    try {
      // Simulate packet loss test
      // In a real implementation, would use ping tests or WebRTC stats
      const simulatedPacketLoss = Math.random() * 2; // 0-2%
      
      return Math.round(simulatedPacketLoss * 100) / 100;
    } catch (error) {
      logger.warn('Packet loss test failed:', error);
      return 0.5; // Default 0.5%
    }
  }

  /**
   * Estimate network metrics based on connection type
   */
  private estimateNetworkMetrics(clientInfo: ClientNetworkInfo): NetworkTestResult {
    let downloadSpeed = 5000; // Default 5 Mbps
    let latency = 80; // Default 80ms

    switch (clientInfo.connectionType) {
      case 'wifi':
        downloadSpeed = 8000 + Math.random() * 12000; // 8-20 Mbps
        latency = 20 + Math.random() * 50; // 20-70ms
        break;
      case 'cellular':
        downloadSpeed = 2000 + Math.random() * 8000; // 2-10 Mbps
        latency = 50 + Math.random() * 100; // 50-150ms
        break;
      case 'ethernet':
        downloadSpeed = 15000 + Math.random() * 25000; // 15-40 Mbps
        latency = 10 + Math.random() * 30; // 10-40ms
        break;
    }

    return {
      downloadSpeed,
      uploadSpeed: downloadSpeed * 0.1,
      latency,
      jitter: latency * 0.1,
      packetLoss: Math.random() * 2,
      testDuration: 1000,
      server: 'estimated'
    };
  }

  /**
   * Determine connection type from client info
   */
  private determineConnectionType(clientInfo: ClientNetworkInfo, testResult: NetworkTestResult): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    if (clientInfo.connectionType) {
      const type = clientInfo.connectionType.toLowerCase();
      if (type.includes('wifi')) return 'wifi';
      if (type.includes('cellular') || type.includes('mobile')) return 'cellular';
      if (type.includes('ethernet') || type.includes('wired')) return 'ethernet';
    }

    // Estimate based on speed and latency
    if (testResult.downloadSpeed > 10000 && testResult.latency < 50) {
      return 'ethernet';
    } else if (testResult.downloadSpeed < 5000 || testResult.latency > 150) {
      return 'cellular';
    } else {
      return 'wifi';
    }
  }

  /**
   * Calculate network quality score
   */
  private calculateNetworkQuality(testResult: NetworkTestResult, clientInfo: ClientNetworkInfo): 'excellent' | 'good' | 'fair' | 'poor' {
    let score = 0;

    // Bandwidth scoring (0-40 points)
    if (testResult.downloadSpeed > 20000) score += 40;
    else if (testResult.downloadSpeed > 10000) score += 30;
    else if (testResult.downloadSpeed > 5000) score += 20;
    else if (testResult.downloadSpeed > 2000) score += 10;

    // Latency scoring (0-30 points)
    if (testResult.latency < 30) score += 30;
    else if (testResult.latency < 60) score += 20;
    else if (testResult.latency < 120) score += 10;

    // Jitter scoring (0-15 points)
    if (testResult.jitter < 10) score += 15;
    else if (testResult.jitter < 30) score += 10;
    else if (testResult.jitter < 50) score += 5;

    // Packet loss scoring (0-15 points)
    if (testResult.packetLoss < 0.5) score += 15;
    else if (testResult.packetLoss < 2) score += 10;
    else if (testResult.packetLoss < 5) score += 5;

    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'fair';
    return 'poor';
  }

  /**
   * Analyze user agent for device capabilities
   */
  private analyzeUserAgent(userAgent: string): any {
    const capabilities: any = {
      isMobile: /mobile|android|iphone/i.test(userAgent),
      isTablet: /tablet|ipad/i.test(userAgent),
      browser: 'unknown',
      os: 'unknown',
      supportsWebP: false,
      supportsAVIF: false
    };

    // Detect browser
    if (/chrome/i.test(userAgent)) capabilities.browser = 'chrome';
    else if (/firefox/i.test(userAgent)) capabilities.browser = 'firefox';
    else if (/safari/i.test(userAgent)) capabilities.browser = 'safari';
    else if (/edge/i.test(userAgent)) capabilities.browser = 'edge';

    // Detect OS
    if (/windows/i.test(userAgent)) capabilities.os = 'windows';
    else if (/mac|os x/i.test(userAgent)) capabilities.os = 'macos';
    else if (/android/i.test(userAgent)) capabilities.os = 'android';
    else if (/ios|iphone|ipad/i.test(userAgent)) capabilities.os = 'ios';

    // Feature detection based on browser
    if (capabilities.browser === 'chrome' || capabilities.browser === 'firefox') {
      capabilities.supportsWebP = true;
      capabilities.supportsAVIF = capabilities.browser === 'chrome';
    }

    return capabilities;
  }

  /**
   * Store network metrics in history
   */
  private storeNetworkMetrics(clientId: string, metrics: NetworkMetrics): void {
    const history = this.networkHistory.get(clientId) || [];
    history.push(metrics);
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.networkHistory.set(clientId, history);
  }

  /**
   * Get default network metrics
   */
  private getDefaultNetworkMetrics(clientInfo: ClientNetworkInfo): NetworkMetrics {
    return {
      bandwidth: 5000,
      latency: 80,
      jitter: 10,
      packetLoss: 0.5,
      connectionType: 'unknown',
      networkQuality: 'fair',
      timestamp: new Date()
    };
  }

  /**
   * Adapt content based on network conditions
   */
  async adaptContent(
    contentId: string,
    currentQuality: string,
    networkMetrics: NetworkMetrics
  ): Promise<ContentAdaptation> {
    try {
      logger.info(`Adapting content ${contentId} based on network conditions`);

      // Find matching adaptation strategies
      const matchingStrategies = this.findMatchingStrategies(networkMetrics);
      
      // Apply adaptations
      const adaptedQuality = this.calculateAdaptedQuality(currentQuality, matchingStrategies);
      const appliedActions = this.generateAdaptationActions(matchingStrategies);

      const adaptation: ContentAdaptation = {
        contentId,
        originalQuality: currentQuality,
        adaptedQuality,
        adaptationReason: this.getAdaptationReason(matchingStrategies),
        networkConditions: networkMetrics,
        appliedActions,
        timestamp: new Date()
      };

      // Store adaptation in history
      this.storeContentAdaptation(contentId, adaptation);

      logger.info(`Content adapted: ${currentQuality} -> ${adaptedQuality}`);
      this.eventEmitter.emit('content:adapted', adaptation);

      return adaptation;
    } catch (error) {
      logger.error('Error adapting content:', error);
      throw error;
    }
  }

  /**
   * Find adaptation strategies that match network conditions
   */
  private findMatchingStrategies(networkMetrics: NetworkMetrics): AdaptationStrategy[] {
    return Array.from(this.adaptationStrategies.values())
      .filter(strategy => 
        strategy.isActive && 
        this.evaluateStrategyConditions(strategy.conditions, networkMetrics)
      )
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Evaluate if strategy conditions match network metrics
   */
  private evaluateStrategyConditions(conditions: AdaptationCondition[], networkMetrics: NetworkMetrics): boolean {
    return conditions.every(condition => {
      const value = this.getMetricValue(condition.type, networkMetrics);
      const conditionValue = condition.value;
      
      switch (condition.operator) {
        case 'less_than':
          return typeof value === 'number' && typeof conditionValue === 'number' && value < conditionValue;
        case 'greater_than':
          return typeof value === 'number' && typeof conditionValue === 'number' && value > conditionValue;
        case 'equals':
          return value === conditionValue;
        case 'between':
          if (typeof value !== 'number' || !Array.isArray(conditionValue)) return false;
          const [min, max] = conditionValue;
          return value >= min && value <= max;
        default:
          return false;
      }
    });
  }

  /**
   * Get metric value by type
   */
  private getMetricValue(type: string, networkMetrics: NetworkMetrics): number | string {
    switch (type) {
      case 'bandwidth': return networkMetrics.bandwidth;
      case 'latency': return networkMetrics.latency;
      case 'packet_loss': return networkMetrics.packetLoss;
      case 'connection_type': return networkMetrics.connectionType;
      default: return 0;
    }
  }

  /**
   * Calculate adapted quality based on strategies
   */
  private calculateAdaptedQuality(currentQuality: string, strategies: AdaptationStrategy[]): string {
    if (strategies.length === 0) return currentQuality;

    // Find the most restrictive quality requirement
    let targetQuality = currentQuality;
    
    strategies.forEach(strategy => {
      strategy.actions.forEach(action => {
        if (action.type === 'reduce_quality') {
          const proposedQuality = action.parameters.targetQuality;
          if (this.isQualityLower(proposedQuality, targetQuality)) {
            targetQuality = proposedQuality;
          }
        }
      });
    });

    return targetQuality;
  }

  /**
   * Check if quality is lower than current
   */
  private isQualityLower(proposed: string, current: string): boolean {
    const qualityOrder = ['144p', '240p', '360p', '480p', '720p', '1080p', '1440p', '4k'];
    const proposedIndex = qualityOrder.indexOf(proposed);
    const currentIndex = qualityOrder.indexOf(current);
    
    return proposedIndex < currentIndex;
  }

  /**
   * Generate adaptation actions
   */
  private generateAdaptationActions(strategies: AdaptationStrategy[]): AdaptationAction[] {
    const actions: AdaptationAction[] = [];
    
    strategies.forEach(strategy => {
      actions.push(...strategy.actions);
    });

    return actions;
  }

  /**
   * Get adaptation reason
   */
  private getAdaptationReason(strategies: AdaptationStrategy[]): string {
    if (strategies.length === 0) return 'No adaptation needed';
    
    return strategies.map(strategy => strategy.name).join(', ');
  }

  /**
   * Store content adaptation in history
   */
  private storeContentAdaptation(contentId: string, adaptation: ContentAdaptation): void {
    const history = this.adaptationHistory.get(contentId) || [];
    history.push(adaptation);
    
    // Keep only last 50 adaptations
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.adaptationHistory.set(contentId, history);
  }

  /**
   * Perform network health check
   */
  private async performNetworkHealthCheck(): Promise<void> {
    try {
      // Check connectivity to test servers
      const healthPromises = this.networkTestServers.map(server => 
        this.checkServerHealth(server)
      );

      const results = await Promise.allSettled(healthPromises);
      const healthyServers = results.filter(result => result.status === 'fulfilled').length;
      
      if (healthyServers < this.networkTestServers.length * 0.5) {
        logger.warn(`Network health check: Only ${healthyServers}/${this.networkTestServers.length} servers healthy`);
        this.eventEmitter.emit('network:health-warning', { healthyServers, totalServers: this.networkTestServers.length });
      }
    } catch (error) {
      logger.error('Network health check failed:', error);
    }
  }

  /**
   * Check individual server health
   */
  private async checkServerHealth(server: string): Promise<boolean> {
    try {
      // Simulate health check
      return Math.random() > 0.1; // 90% success rate
    } catch (error) {
      return false;
    }
  }

  /**
   * Get network metrics history
   */
  getNetworkHistory(clientId: string): NetworkMetrics[] {
    return this.networkHistory.get(clientId) || [];
  }

  /**
   * Get content adaptation history
   */
  getAdaptationHistory(contentId: string): ContentAdaptation[] {
    return this.adaptationHistory.get(contentId) || [];
  }

  /**
   * Get adaptation strategies
   */
  getAdaptationStrategies(): AdaptationStrategy[] {
    return Array.from(this.adaptationStrategies.values());
  }

  /**
   * Add custom adaptation strategy
   */
  addAdaptationStrategy(strategy: AdaptationStrategy): void {
    this.adaptationStrategies.set(strategy.id, strategy);
    logger.info(`Added adaptation strategy: ${strategy.name}`);
  }

  /**
   * Get network statistics
   */
  getNetworkStatistics(): {
    totalClients: number;
    averageBandwidth: number;
    averageLatency: number;
    qualityDistribution: Record<string, number>;
  } {
    const allMetrics = Array.from(this.networkHistory.values()).flat();
    
    if (allMetrics.length === 0) {
      return {
        totalClients: 0,
        averageBandwidth: 0,
        averageLatency: 0,
        qualityDistribution: {}
      };
    }

    const averageBandwidth = allMetrics.reduce((sum, m) => sum + m.bandwidth, 0) / allMetrics.length;
    const averageLatency = allMetrics.reduce((sum, m) => sum + m.latency, 0) / allMetrics.length;
    
    const qualityDistribution = allMetrics.reduce((dist, m) => {
      dist[m.networkQuality] = (dist[m.networkQuality] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalClients: this.networkHistory.size,
      averageBandwidth: Math.round(averageBandwidth),
      averageLatency: Math.round(averageLatency),
      qualityDistribution
    };
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    this.eventEmitter.removeAllListeners();
    logger.info('Network detection service destroyed');
  }
}
