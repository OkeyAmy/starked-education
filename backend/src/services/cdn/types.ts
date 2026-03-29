/**
 * CDN Provider Interface and Types
 */

export interface CDNProvider {
  id: string;
  name: string;
  priority: number;
  regions: string[];
  endpoints: CDNEndpoint[];
  healthCheckUrl: string;
  isActive: boolean;
  latency: number;
  bandwidth: number;
  reliability: number;
  costPerGB: number;
}

export interface CDNEndpoint {
  url: string;
  region: string;
  priority: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
  latency: number;
}

export interface CDNHealthCheck {
  providerId: string;
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency: number;
  timestamp: Date;
  error?: string;
}

export interface CDNRoutingRule {
  id: string;
  name: string;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  priority: number;
  isActive: boolean;
}

export interface RoutingCondition {
  type: 'geo' | 'device' | 'network' | 'content_type' | 'time';
  operator: 'equals' | 'contains' | 'in' | 'greater_than' | 'less_than';
  value: string | number | string[];
  weight?: number;
}

export interface RoutingAction {
  type: 'select_provider' | 'select_endpoint' | 'compress' | 'cache' | 'transform';
  parameters: Record<string, any>;
}

export interface CDNSelectionResult {
  provider: CDNProvider;
  endpoint: CDNEndpoint;
  fallbackProviders: CDNProvider[];
  routingReason: string;
  estimatedLatency: number;
  estimatedBandwidth: number;
}

export interface CDNMetrics {
  providerId: string;
  region: string;
  timestamp: Date;
  requests: number;
  bytesTransferred: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  cost: number;
}

export interface ContentDeliveryRequest {
  contentId: string;
  contentType: string;
  clientInfo: ClientInfo;
  requestedQuality?: QualityLevel;
  preferLowLatency?: boolean;
  maxCostPerGB?: number;
}

export interface ClientInfo {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  country?: string;
  region?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'tv';
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  networkSpeed?: number;
}

export enum QualityLevel {
  AUTO = 'auto',
  LOW = '360p',
  MEDIUM = '720p',
  HIGH = '1080p',
  ULTRA = '4k'
}

export interface DeliveryOptimizationResult {
  optimizedUrl: string;
  provider: CDNProvider;
  compressionApplied: boolean;
  qualityLevel: QualityLevel;
  estimatedLatency: number;
  estimatedBandwidth: number;
  cost: number;
  cacheHeaders: Record<string, string>;
  securityHeaders: Record<string, string>;
}
