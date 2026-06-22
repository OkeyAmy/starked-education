/**
 * Content Controller
 * Handles HTTP requests for content management
 */

import { Request, Response } from 'express';
import { ContentService } from '../services/contentService';
import { MediaService } from '../services/mediaService';
import multiTierCache from '../services/multiTierCache';
const cache = new multiTierCache();
import { 
  ContentCreateRequest, 
  ContentUpdateRequest, 
  BulkOperation,
  ContentFilter,
  ContentExportOptions 
} from '../models/Content';
import logger from '../utils/logger';

export class ContentController {
  constructor(
    private contentService: ContentService,
    private mediaService: MediaService
  ) {}

  /**
   * Create new content
   */
  async createContent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const contentRequest: ContentCreateRequest = req.body;
      const content = await this.contentService.createContent(contentRequest, userId);

      await cache.del('content:list');
      res.status(201).json({
        success: true,
        data: content,
        message: 'Content created successfully'
      });
    } catch (error) {
      logger.error('Error in createContent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cacheKey = `content:id:${id}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json({ success: true, data: cached });
        return;
      }
      const content = await this.contentService.getContentById(id);

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found'
        });
        return;
      }

      // Increment view count
      content.analytics.views++;
      content.analytics.lastViewed = new Date();

      // Store in cache
      await cache.set(cacheKey, content);

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      logger.error('Error in getContentById:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get content with filters
   */
  async getContent(req: Request, res: Response): Promise<void> {
    try {
      const filter: ContentFilter = {
        courseId: req.query.courseId as string,
        moduleId: req.query.moduleId as string,
        type: req.query.type as any,
        status: req.query.status as any,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        createdBy: req.query.createdBy as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20
      };

      // Parse date range if provided
      if (req.query.dateFrom || req.query.dateTo) {
        filter.dateRange = {
          from: new Date(req.query.dateFrom as string),
          to: new Date(req.query.dateTo as string)
        };
      }

      const cacheKey = `content:filter:${JSON.stringify(filter)}`;
      const cached = await cache.get(cacheKey);
      if (cached) {
        res.json(cached);
        return;
      }

      const result = await this.contentService.getContent(filter);

      const response = {
        success: true,
        data: result.content,
        pagination: {
          page: filter.page,
          limit: filter.limit,
          total: result.total,
          pages: Math.ceil(result.total / (filter.limit || 20))
        }
      };

      await cache.set(cacheKey, response);
      res.json(response);
    } catch (error) {
      logger.error('Error in getContent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update content
   */
  async updateContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const updateRequest: ContentUpdateRequest = req.body;
      const content = await this.contentService.updateContent(id, updateRequest, userId);

      await cache.del(`content:id:${req.params.id}`);
      await cache.del('content:list');
      res.json({
        success: true,
        data: content,
        message: 'Content updated successfully'
      });
    } catch (error) {
      logger.error('Error in updateContent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete content
   */
  async deleteContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.contentService.deleteContent(id, userId);

      await cache.del(`content:id:${req.params.id}`);
      await cache.del('content:list');
      res.json({
        success: true,
        message: 'Content deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteContent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Publish content
   */
  async publishContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const content = await this.contentService.publishContent(id, userId);

      await cache.del(`content:id:${req.params.id}`);
      await cache.del('content:list');
      res.json({
        success: true,
        data: content,
        message: 'Content published successfully'
      });
    } catch (error) {
      logger.error('Error in publishContent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload media file
   */
  async uploadMedia(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const options = {
        optimizeImages: req.body.optimizeImages === 'true',
        compressVideos: req.body.compressVideos === 'true',
        generateThumbnails: req.body.generateThumbnails !== 'false',
        watermark: req.body.watermark === 'true',
        maxFileSize: req.body.maxFileSize ? parseInt(req.body.maxFileSize) : undefined,
        allowedFormats: req.body.allowedFormats ? req.body.allowedFormats.split(',') : undefined
      };

      const result = await this.mediaService.uploadMedia(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        userId,
        options
      );

      res.json({
        success: true,
        data: result,
        message: 'Media uploaded successfully'
      });
    } catch (error) {
      logger.error('Error in uploadMedia:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get media file
   */
  async getMediaFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const mediaFile = await this.mediaService.getMediaFile(id);

      if (!mediaFile) {
        res.status(404).json({
          success: false,
          error: 'Media file not found'
        });
        return;
      }

      res.json({
        success: true,
        data: mediaFile
      });
    } catch (error) {
      logger.error('Error in getMediaFile:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete media file
   */
  async deleteMediaFile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.mediaService.deleteMediaFile(id);

      res.json({
        success: true,
        message: 'Media file deleted successfully'
      });
    } catch (error) {
      logger.error('Error in deleteMediaFile:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Perform bulk operations
   */
  async bulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const operation: BulkOperation = req.body;
      await this.contentService.performBulkOperation(operation, userId);

      res.json({
        success: true,
        message: `Bulk operation '${operation.operation}' completed successfully`,
        affectedItems: operation.contentIds.length
      });
    } catch (error) {
      logger.error('Error in bulkOperation:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Export content
   */
  async exportContent(req: Request, res: Response): Promise<void> {
    try {
      const options: ContentExportOptions = {
        format: req.query.format as any || 'json',
        includeMedia: req.query.includeMedia === 'true',
        includeVersions: req.query.includeVersions === 'true',
        includeAnalytics: req.query.includeAnalytics === 'true',
        filters: {
          courseId: req.query.courseId as string,
          moduleId: req.query.moduleId as string,
          type: req.query.type as any,
          status: req.query.status as any,
          tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
          createdBy: req.query.createdBy as string,
          search: req.query.search as string
        }
      };

      const exportData = await this.contentService.exportContent(options);

      // Set appropriate headers
      const filename = `content_export_${Date.now()}.${options.format}`;
      const contentType = this.getContentType(options.format);
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      logger.error('Error in exportContent:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Import content
   */
  async importContent(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
        return;
      }

      const format = req.body.format || 'json';
      const data = req.file.buffer.toString('utf-8');
      
      const result = await this.contentService.importContent(data, format, userId);

      res.json({
        success: result.success,
        data: result,
        message: result.success 
          ? `Imported ${result.imported} items successfully`
          : `Import completed with ${result.failed} errors`
      });
    } catch (error) {
      logger.error('Error in importContent:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get media statistics
   */
  async getMediaStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.mediaService.getMediaStats();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error in getMediaStats:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get content type for export
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'json': 'application/json',
      'csv': 'text/csv',
      'xml': 'application/xml',
      'zip': 'application/zip'
    };

    return contentTypes[format] || 'application/octet-stream';
  }
}
