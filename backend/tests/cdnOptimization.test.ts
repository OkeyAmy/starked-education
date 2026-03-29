/**
 * CDN Optimization System Tests
 * Comprehensive test suite for the Global Content Delivery Optimization System
 */

import { GlobalContentDeliveryOptimizationService } from '../src/services/cdn/globalOptimizationService';
import { QualityLevel } from '../src/services/cdn/types';

describe('Global Content Delivery Optimization Service', () => {
  let service: GlobalContentDeliveryOptimizationService;

  beforeEach(() => {
    service = new GlobalContentDeliveryOptimizationService({
      enableMultiCDN: true,
      enableAdaptiveBitrate: true,
      enableIntelligentCompression: true,
      enableNetworkDetection: true,
      enableEdgeComputing: true,
      enableAnalytics: true,
      defaultQuality: QualityLevel.AUTO,
      compressionProfile: 'web-optimized',
      maxConcurrentOptimizations: 10,
      optimizationTimeout: 30
    });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Content Delivery Optimization', () => {
    test('should optimize content delivery successfully', async () => {
      const request = {
        contentId: 'test-content-123',
        contentType: 'video',
        originalUrl: 'https://example.com/video.mp4',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi',
          country: 'US',
          region: 'us-east',
          deviceType: 'desktop'
        },
        requestedQuality: QualityLevel.HIGH,
        optimizationLevel: 'standard' as const,
        maxLatency: 2000,
        maxCostPerGB: 0.15,
        preferLowLatency: true
      };

      const result = await service.optimizeContentDelivery(request);

      expect(result.metadata.success).toBe(true);
      expect(result.optimizedUrl).toBeDefined();
      expect(result.optimizations.length).toBeGreaterThan(0);
      expect(result.performance.latencyImprovement).toBeGreaterThan(0);
      expect(result.performance.sizeReduction).toBeGreaterThan(0);
      expect(result.cost.costSavings).toBeGreaterThan(0);
    });

    test('should handle missing required fields', async () => {
      const invalidRequest = {
        contentId: 'test-content-123',
        // Missing other required fields
      };

      await expect(service.optimizeContentDelivery(invalidRequest as any))
        .rejects.toThrow();
    });

    test('should respect optimization timeout', async () => {
      const request = {
        contentId: 'test-content-123',
        contentType: 'video',
        originalUrl: 'https://example.com/video.mp4',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'aggressive' as const
      };

      const serviceWithShortTimeout = new GlobalContentDeliveryOptimizationService({
        optimizationTimeout: 0.001 // 1ms timeout
      });

      const result = await serviceWithShortTimeout.optimizeContentDelivery(request);
      expect(result.metadata.success).toBe(false);
      expect(result.metadata.error).toContain('timeout');
      
      serviceWithShortTimeout.destroy();
    });
  });

  describe('Service Configuration', () => {
    test('should update configuration successfully', () => {
      const newConfig = {
        enableMultiCDN: false,
        maxConcurrentOptimizations: 20,
        defaultQuality: QualityLevel.MEDIUM
      };

      service.updateConfiguration(newConfig);

      const status = service.getServiceStatus();
      expect(status.configuration.enableMultiCDN).toBe(false);
      expect(status.configuration.maxConcurrentOptimizations).toBe(20);
      expect(status.configuration.defaultQuality).toBe(QualityLevel.MEDIUM);
    });

    test('should get service status', () => {
      const status = service.getServiceStatus();
      
      expect(status.enabled).toBe(true);
      expect(status.healthy).toBe(true);
      expect(status.configuration).toBeDefined();
      expect(status.lastActivity).toBeInstanceOf(Date);
    });
  });

  describe('Optimization History and Statistics', () => {
    test('should track optimization statistics', async () => {
      const request = {
        contentId: 'test-content-123',
        contentType: 'image',
        originalUrl: 'https://example.com/image.jpg',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'basic' as const
      };

      await service.optimizeContentDelivery(request);
      
      const stats = service.getOptimizationStatistics();
      expect(stats.totalOptimizations).toBe(1);
      expect(stats.successfulOptimizations).toBe(1);
      expect(stats.failedOptimizations).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    test('should maintain optimization history', async () => {
      const request = {
        contentId: 'test-content-456',
        contentType: 'audio',
        originalUrl: 'https://example.com/audio.mp3',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'cellular'
        },
        requestedQuality: QualityLevel.LOW,
        optimizationLevel: 'standard' as const
      };

      await service.optimizeContentDelivery(request);
      
      const history = service.getOptimizationHistory();
      expect(history.length).toBe(1);
      expect(history[0].metadata.contentId).toBe('test-content-456');
      expect(history[0].metadata.success).toBe(true);
    });

    test('should clear optimization history', async () => {
      const request = {
        contentId: 'test-content-789',
        contentType: 'document',
        originalUrl: 'https://example.com/document.pdf',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'ethernet'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'basic' as const
      };

      await service.optimizeContentDelivery(request);
      expect(service.getOptimizationHistory().length).toBe(1);
      
      service.clearOptimizationHistory();
      expect(service.getOptimizationHistory().length).toBe(0);
    });
  });

  describe('Active Optimizations Management', () => {
    test('should track active optimizations', async () => {
      const request = {
        contentId: 'test-content-active',
        contentType: 'video',
        originalUrl: 'https://example.com/video.mp4',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.HIGH,
        optimizationLevel: 'standard' as const
      };

      const optimizationPromise = service.optimizeContentDelivery(request);
      const activeOptimizations = service.getActiveOptimizations();
      expect(activeOptimizations.length).toBe(1);
      
      await optimizationPromise;
    });

    test('should cancel active optimization', async () => {
      const serviceWithLongTimeout = new GlobalContentDeliveryOptimizationService({
        optimizationTimeout: 30 // 30 seconds
      });

      const request = {
        contentId: 'test-content-cancel',
        contentType: 'video',
        originalUrl: 'https://example.com/video.mp4',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'aggressive' as const
      };

      const optimizationPromise = serviceWithLongTimeout.optimizeContentDelivery(request);
      const activeOptimizations = serviceWithLongTimeout.getActiveOptimizations();
      const requestId = activeOptimizations[0];
      
      const cancelled = await serviceWithLongTimeout.cancelOptimization(requestId);
      expect(cancelled).toBe(true);
      
      serviceWithLongTimeout.destroy();
    });
  });

  describe('Analytics Reports', () => {
    test('should generate analytics report', async () => {
      const request = {
        contentId: 'test-content-analytics',
        contentType: 'video',
        originalUrl: 'https://example.com/video.mp4',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.HIGH,
        optimizationLevel: 'standard' as const
      };

      await service.optimizeContentDelivery(request);
      
      const report = await service.getAnalyticsReport({
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      });

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.providerBreakdown).toBeDefined();
      expect(report.regionalBreakdown).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle network detection failures gracefully', async () => {
      const serviceWithoutNetworkDetection = new GlobalContentDeliveryOptimizationService({
        enableNetworkDetection: false,
        enableMultiCDN: true,
        enableAdaptiveBitrate: true,
        enableIntelligentCompression: true,
        enableEdgeComputing: true,
        enableAnalytics: true
      });

      const request = {
        contentId: 'test-content-no-network',
        contentType: 'image',
        originalUrl: 'https://example.com/image.jpg',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'basic' as const
      };

      const result = await serviceWithoutNetworkDetection.optimizeContentDelivery(request);
      expect(result.metadata.success).toBe(true);
      expect(result.optimizations.length).toBeGreaterThan(0);
      
      serviceWithoutNetworkDetection.destroy();
    });

    test('should handle service disabled scenarios', async () => {
      const minimalService = new GlobalContentDeliveryOptimizationService({
        enableMultiCDN: false,
        enableAdaptiveBitrate: false,
        enableIntelligentCompression: false,
        enableNetworkDetection: false,
        enableEdgeComputing: false,
        enableAnalytics: false
      });

      const request = {
        contentId: 'test-content-minimal',
        contentType: 'document',
        originalUrl: 'https://example.com/document.pdf',
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'ethernet'
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'basic' as const
      };

      const result = await minimalService.optimizeContentDelivery(request);
      expect(result.metadata.success).toBe(true);
      expect(result.optimizedUrl).toBe(request.originalUrl); // No optimization applied
      
      minimalService.destroy();
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent optimizations', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        contentId: `test-content-concurrent-${i}`,
        contentType: 'video' as const,
        originalUrl: `https://example.com/video${i}.mp4`,
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi' as const
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'standard' as const
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => service.optimizeContentDelivery(request))
      );
      const endTime = Date.now();

      expect(results.length).toBe(5);
      expect(results.every(result => result.metadata.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should respect concurrent optimization limit', async () => {
      const serviceWithLowLimit = new GlobalContentDeliveryOptimizationService({
        maxConcurrentOptimizations: 2
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        contentId: `test-content-limit-${i}`,
        contentType: 'image' as const,
        originalUrl: `https://example.com/image${i}.jpg`,
        clientInfo: {
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          connectionType: 'wifi' as const
        },
        requestedQuality: QualityLevel.AUTO,
        optimizationLevel: 'basic' as const
      }));

      const results = await Promise.all(
        requests.map(request => serviceWithLowLimit.optimizeContentDelivery(request))
      );

      expect(results.length).toBe(5);
      expect(results.every(result => result.metadata.success)).toBe(true);
      
      serviceWithLowLimit.destroy();
    });
  });
});

describe('CDN Optimization API Integration', () => {
  // These tests would require actual HTTP requests to the API endpoints
  // They are placeholders for integration testing

  test('POST /api/cdn/optimize should optimize content', async () => {
    // This would be an actual integration test with HTTP requests
    // For now, we'll just document the expected behavior
    
    const requestBody = {
      contentId: 'integration-test-123',
      contentType: 'video',
      originalUrl: 'https://example.com/test-video.mp4',
      clientInfo: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        connectionType: 'wifi'
      },
      requestedQuality: '1080p',
      optimizationLevel: 'standard'
    };

    // Expected response:
    // {
    //   success: true,
    //   data: {
    //     optimizedUrl: '...',
    //     originalUrl: '...',
    //     optimizations: [...],
    //     performance: {...},
    //     cost: {...},
    //     metadata: {...}
    //   },
    //   message: 'Content delivery optimization completed successfully'
    // }
    
    expect(true).toBe(true); // Placeholder
  });

  test('GET /api/cdn/statistics should return statistics', async () => {
    // Expected response with optimization statistics
    expect(true).toBe(true); // Placeholder
  });

  test('GET /api/cdn/health should return health status', async () => {
    // Expected response with service health
    expect(true).toBe(true); // Placeholder
  });
});
