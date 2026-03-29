/**
 * CDN Optimization Controller
 * Handles HTTP requests for content delivery optimization
 */

import { Request, Response } from 'express';
import { GlobalContentDeliveryOptimizationService } from '../services/cdn/globalOptimizationService';
import { QualityLevel } from '../services/cdn/types';
import logger from '../utils/logger';

export class CDNOptimizationController {
  private optimizationService: GlobalContentDeliveryOptimizationService;

  constructor() {
    this.optimizationService = new GlobalContentDeliveryOptimizationService();
  }

  /**
   * Optimize content delivery
   */
  async optimizeContent(req: Request, res: Response): Promise<void> {
    try {
      const {
        contentId,
        contentType,
        originalUrl,
        clientInfo,
        requestedQuality,
        optimizationLevel = 'standard',
        maxLatency,
        maxCostPerGB,
        preferLowLatency = false
      } = req.body;

      // Validate required fields
      if (!contentId || !contentType || !originalUrl || !clientInfo) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: contentId, contentType, originalUrl, clientInfo'
        });
        return;
      }

      // Validate client info
      if (!clientInfo.ip || !clientInfo.userAgent || !clientInfo.connectionType) {
        res.status(400).json({
          success: false,
          message: 'Missing required client info fields: ip, userAgent, connectionType'
        });
        return;
      }

      // Validate quality level
      if (requestedQuality && !Object.values(QualityLevel).includes(requestedQuality)) {
        res.status(400).json({
          success: false,
          message: `Invalid quality level. Must be one of: ${Object.values(QualityLevel).join(', ')}`
        });
        return;
      }

      const optimizationRequest = {
        contentId,
        contentType,
        originalUrl,
        clientInfo,
        requestedQuality,
        optimizationLevel,
        maxLatency,
        maxCostPerGB,
        preferLowLatency
      };

      logger.info(`Processing optimization request for content: ${contentId}`);

      const result = await this.optimizationService.optimizeContentDelivery(optimizationRequest);

      res.status(200).json({
        success: true,
        data: result,
        message: 'Content delivery optimization completed successfully'
      });

    } catch (error) {
      logger.error('Error in optimizeContent:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during content optimization',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get optimization statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.optimizationService.getOptimizationStatistics();

      res.status(200).json({
        success: true,
        data: stats,
        message: 'Optimization statistics retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get optimization history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const history = this.optimizationService.getOptimizationHistory(limit);

      res.status(200).json({
        success: true,
        data: history,
        message: 'Optimization history retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get service status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.optimizationService.getServiceStatus();

      res.status(200).json({
        success: true,
        data: status,
        message: 'Service status retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving service status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update service configuration
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;

      // Validate configuration
      if (typeof config !== 'object' || config === null) {
        res.status(400).json({
          success: false,
          message: 'Invalid configuration format'
        });
        return;
      }

      this.optimizationService.updateConfiguration(config);

      res.status(200).json({
        success: true,
        message: 'Configuration updated successfully'
      });

    } catch (error) {
      logger.error('Error in updateConfiguration:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while updating configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel active optimization
   */
  async cancelOptimization(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;

      if (!requestId) {
        res.status(400).json({
          success: false,
          message: 'Missing requestId parameter'
        });
        return;
      }

      const cancelled = await this.optimizationService.cancelOptimization(requestId);

      if (cancelled) {
        res.status(200).json({
          success: true,
          message: 'Optimization cancelled successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Optimization not found or already completed'
        });
      }

    } catch (error) {
      logger.error('Error in cancelOptimization:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while cancelling optimization',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active optimizations
   */
  async getActiveOptimizations(req: Request, res: Response): Promise<void> {
    try {
      const activeOptimizations = this.optimizationService.getActiveOptimizations();

      res.status(200).json({
        success: true,
        data: activeOptimizations,
        message: 'Active optimizations retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getActiveOptimizations:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while retrieving active optimizations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get analytics report
   */
  async getAnalyticsReport(req: Request, res: Response): Promise<void> {
    try {
      const { start, end } = req.query;

      let timeRange;
      if (start && end) {
        timeRange = {
          start: new Date(start as string),
          end: new Date(end as string)
        };

        // Validate date range
        if (isNaN(timeRange.start.getTime()) || isNaN(timeRange.end.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid date format. Use ISO 8601 format.'
          });
          return;
        }

        if (timeRange.start >= timeRange.end) {
          res.status(400).json({
            success: false,
            message: 'Start date must be before end date.'
          });
          return;
        }
      }

      const report = await this.optimizationService.getAnalyticsReport(timeRange);

      res.status(200).json({
        success: true,
        data: report,
        message: 'Analytics report retrieved successfully'
      });

    } catch (error) {
      logger.error('Error in getAnalyticsReport:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while generating analytics report',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Clear optimization history
   */
  async clearHistory(req: Request, res: Response): Promise<void> {
    try {
      this.optimizationService.clearOptimizationHistory();

      res.status(200).json({
        success: true,
        message: 'Optimization history cleared successfully'
      });

    } catch (error) {
      logger.error('Error in clearHistory:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error while clearing history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Health check endpoint
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const status = this.optimizationService.getServiceStatus();

      const healthStatus = {
        status: status.healthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        activeOptimizations: this.optimizationService.getActiveOptimizations().length,
        totalOptimizations: this.optimizationService.getOptimizationStatistics().totalOptimizations
      };

      res.status(status.healthy ? 200 : 503).json({
        success: status.healthy,
        data: healthStatus,
        message: status.healthy ? 'Service is healthy' : 'Service is unhealthy'
      });

    } catch (error) {
      logger.error('Error in healthCheck:', error);
      res.status(503).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
