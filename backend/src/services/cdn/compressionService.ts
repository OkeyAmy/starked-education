/**
 * Intelligent Content Compression Service
 * AI-powered compression algorithms for optimal content delivery
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { MediaFormat } from '../models/Content';

export interface CompressionConfig {
  contentType: 'image' | 'video' | 'audio' | 'document';
  quality: number; // 1-100
  preserveMetadata: boolean;
  targetSize?: number; // in bytes
  targetBandwidth?: number; // in kbps
  compressionLevel: 'low' | 'medium' | 'high' | 'maximum';
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  processingTime: number;
  format: string;
  quality: number;
  success: boolean;
  error?: string;
  metadata: CompressionMetadata;
}

export interface CompressionMetadata {
  algorithm: string;
  parameters: Record<string, any>;
  aiOptimizations: AIOptimization[];
  estimatedBandwidthSavings: number;
  estimatedQualityLoss: number;
}

export interface AIOptimization {
  type: 'color_reduction' | 'spatial_compression' | 'temporal_compression' | 'frequency_optimization';
  confidence: number;
  impact: string;
  parameters: Record<string, any>;
}

export interface ContentAnalysis {
  contentType: string;
  complexity: 'simple' | 'moderate' | 'complex';
  dominantColors: string[];
  hasTransparency: boolean;
  hasAnimation: boolean;
  estimatedQuality: number;
  recommendedFormat: string;
  recommendedCompression: CompressionConfig;
}

export interface CompressionProfile {
  name: string;
  description: string;
  config: CompressionConfig;
  supportedFormats: string[];
  targetUseCase: 'web' | 'mobile' | 'print' | 'archive';
}

export class IntelligentCompressionService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private compressionProfiles: Map<string, CompressionProfile> = new Map();
  private aiModel: AICompressionModel;

  constructor() {
    this.aiModel = new AICompressionModel();
    this.initializeCompressionProfiles();
  }

  /**
   * Initialize compression profiles for different use cases
   */
  private initializeCompressionProfiles(): void {
    const profiles: CompressionProfile[] = [
      {
        name: 'web-optimized',
        description: 'Optimized for web delivery with balanced quality and size',
        config: {
          contentType: 'image',
          quality: 85,
          preserveMetadata: false,
          compressionLevel: 'high'
        },
        supportedFormats: ['jpg', 'png', 'webp', 'avif'],
        targetUseCase: 'web'
      },
      {
        name: 'mobile-optimized',
        description: 'Optimized for mobile devices with bandwidth constraints',
        config: {
          contentType: 'image',
          quality: 75,
          preserveMetadata: false,
          targetBandwidth: 500, // 500 kbps
          compressionLevel: 'maximum'
        },
        supportedFormats: ['jpg', 'webp', 'avif'],
        targetUseCase: 'mobile'
      },
      {
        name: 'print-quality',
        description: 'High quality preservation for print purposes',
        config: {
          contentType: 'image',
          quality: 95,
          preserveMetadata: true,
          compressionLevel: 'low'
        },
        supportedFormats: ['png', 'tiff', 'jpg'],
        targetUseCase: 'print'
      },
      {
        name: 'archive-optimized',
        description: 'Maximum compression for long-term storage',
        config: {
          contentType: 'image',
          quality: 60,
          preserveMetadata: true,
          compressionLevel: 'maximum'
        },
        supportedFormats: ['jpg', 'png', 'webp'],
        targetUseCase: 'archive'
      }
    ];

    profiles.forEach(profile => {
      this.compressionProfiles.set(profile.name, profile);
    });

    logger.info(`Initialized ${profiles.length} compression profiles`);
  }

  /**
   * Compress content intelligently
   */
  async compressContent(
    inputPath: string,
    outputPath: string,
    profileName: string = 'web-optimized'
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Starting intelligent compression for: ${inputPath}`);

      // Get compression profile
      const profile = this.compressionProfiles.get(profileName);
      if (!profile) {
        throw new Error(`Compression profile not found: ${profileName}`);
      }

      // Analyze content
      const analysis = await this.analyzeContent(inputPath);
      logger.info(`Content analysis completed: ${JSON.stringify(analysis)}`);

      // Apply AI optimizations
      const optimizations = await this.aiModel.generateOptimizations(analysis, profile.config);
      logger.info(`Generated ${optimizations.length} AI optimizations`);

      // Perform compression
      const result = await this.performCompression(
        inputPath,
        outputPath,
        profile.config,
        optimizations
      );

      const processingTime = Date.now() - startTime;
      result.processingTime = processingTime;

      logger.info(`Compression completed: ${result.originalSize} -> ${result.compressedSize} bytes (${result.compressionRatio}% reduction)`);
      this.eventEmitter.emit('compression:completed', result);

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult: CompressionResult = {
        originalSize: 0,
        compressedSize: 0,
        compressionRatio: 0,
        processingTime,
        format: '',
        quality: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          algorithm: 'none',
          parameters: {},
          aiOptimizations: [],
          estimatedBandwidthSavings: 0,
          estimatedQualityLoss: 0
        }
      };

      logger.error('Compression failed:', error);
      this.eventEmitter.emit('compression:failed', errorResult);
      
      return errorResult;
    }
  }

  /**
   * Analyze content for intelligent compression
   */
  private async analyzeContent(inputPath: string): Promise<ContentAnalysis> {
    try {
      const stats = fs.statSync(inputPath);
      const ext = path.extname(inputPath).toLowerCase();
      
      let analysis: ContentAnalysis = {
        contentType: this.getContentType(ext),
        complexity: 'moderate',
        dominantColors: [],
        hasTransparency: false,
        hasAnimation: false,
        estimatedQuality: 80,
        recommendedFormat: 'jpg',
        recommendedCompression: {
          contentType: 'image',
          quality: 85,
          preserveMetadata: false,
          compressionLevel: 'medium'
        }
      };

      // Use Sharp for image analysis
      if (this.isImageFormat(ext)) {
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Analyze image properties
        analysis.hasTransparency = metadata.hasAlpha || false;
        analysis.estimatedQuality = this.estimateImageQuality(metadata);
        
        // Get dominant colors
        try {
          const { dominant } = await image.stats();
          analysis.dominantColors = this.extractDominantColors(dominant);
        } catch (error) {
          logger.warn('Could not extract dominant colors:', error);
        }

        // Determine complexity based on image characteristics
        analysis.complexity = this.determineImageComplexity(metadata);

        // Recommend format based on analysis
        analysis.recommendedFormat = this.recommendFormat(analysis);
        
        // Recommend compression settings
        analysis.recommendedCompression = this.generateCompressionConfig(analysis);
      }

      return analysis;
    } catch (error) {
      logger.error('Error analyzing content:', error);
      throw error;
    }
  }

  /**
   * Perform actual compression with optimizations
   */
  private async performCompression(
    inputPath: string,
    outputPath: string,
    config: CompressionConfig,
    optimizations: AIOptimization[]
  ): Promise<CompressionResult> {
    const startTime = Date.now();
    const originalStats = fs.statSync(inputPath);
    const originalSize = originalStats.size;

    try {
      let image = sharp(inputPath);
      const ext = path.extname(outputPath).toLowerCase();
      
      // Apply AI optimizations
      for (const optimization of optimizations) {
        image = this.applyOptimization(image, optimization);
      }

      // Apply compression settings
      image = this.applyCompressionSettings(image, config, ext);

      // Save compressed image
      await image.toFile(outputPath);

      const compressedStats = fs.statSync(outputPath);
      const compressedSize = compressedStats.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        processingTime: Date.now() - startTime,
        format: ext.substring(1),
        quality: config.quality,
        success: true,
        metadata: {
          algorithm: 'sharp-ai-optimized',
          parameters: config,
          aiOptimizations: optimizations,
          estimatedBandwidthSavings: this.calculateBandwidthSavings(originalSize, compressedSize),
          estimatedQualityLoss: this.estimateQualityLoss(config.quality, optimizations)
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply AI optimization to image processing pipeline
   */
  private applyOptimization(image: sharp.Sharp, optimization: AIOptimization): sharp.Sharp {
    switch (optimization.type) {
      case 'color_reduction':
        const colorReduction = optimization.parameters.reduction || 0.8;
        return image.modulate({
          saturation: colorReduction
        });

      case 'spatial_compression':
        const resizeFactor = optimization.parameters.resizeFactor || 1;
        if (resizeFactor < 1) {
          return image.resize(
            Math.round(800 * resizeFactor),
            Math.round(600 * resizeFactor),
            { fit: 'inside', withoutEnlargement: true }
          );
        }
        return image;

      case 'frequency_optimization':
        const sharpen = optimization.parameters.sharpen || false;
        if (sharpen) {
          return image.sharpen({ sigma: 1, flat: 1, jagged: 2 });
        }
        return image;

      default:
        return image;
    }
  }

  /**
   * Apply compression settings based on configuration
   */
  private applyCompressionSettings(
    image: sharp.Sharp,
    config: CompressionConfig,
    outputFormat: string
  ): sharp.Sharp {
    switch (outputFormat) {
      case '.jpg':
      case '.jpeg':
        return image.jpeg({
          quality: config.quality,
          progressive: true,
          mozjpeg: true
        });

      case '.png':
        return image.png({
          quality: config.quality,
          progressive: true,
          compressionLevel: this.getPngCompressionLevel(config.compressionLevel)
        });

      case '.webp':
        return image.webp({
          quality: config.quality,
          effort: this.getWebpEffort(config.compressionLevel)
        });

      case '.avif':
        return image.avif({
          quality: config.quality,
          effort: this.getAvifEffort(config.compressionLevel)
        });

      default:
        return image.jpeg({ quality: config.quality });
    }
  }

  /**
   * Get PNG compression level based on compression setting
   */
  private getPngCompressionLevel(level: string): number {
    switch (level) {
      case 'low': return 1;
      case 'medium': return 5;
      case 'high': return 8;
      case 'maximum': return 9;
      default: return 5;
    }
  }

  /**
   * Get WebP effort level based on compression setting
   */
  private getWebpEffort(level: string): number {
    switch (level) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 5;
      case 'maximum': return 6;
      default: return 4;
    }
  }

  /**
   * Get AVIF effort level based on compression setting
   */
  private getAvifEffort(level: string): number {
    switch (level) {
      case 'low': return 2;
      case 'medium': return 4;
      case 'high': return 6;
      case 'maximum': return 9;
      default: return 4;
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentType(ext: string): string {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.tiff'];
    const videoExts = ['.mp4', '.avi', '.mov', '.webm'];
    const audioExts = ['.mp3', '.wav', '.ogg', '.aac'];
    const documentExts = ['.pdf', '.doc', '.docx', '.txt'];

    if (imageExts.includes(ext)) return 'image';
    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (documentExts.includes(ext)) return 'document';
    
    return 'unknown';
  }

  /**
   * Check if format is an image
   */
  private isImageFormat(ext: string): boolean {
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.tiff'];
    return imageExts.includes(ext);
  }

  /**
   * Estimate image quality from metadata
   */
  private estimateImageQuality(metadata: sharp.Metadata): number {
    let quality = 80;

    // Consider file size relative to dimensions
    if (metadata.width && metadata.height && metadata.size) {
      const pixelCount = metadata.width * metadata.height;
      const bytesPerPixel = metadata.size / pixelCount;
      
      if (bytesPerPixel > 3) quality = 95;
      else if (bytesPerPixel > 2) quality = 85;
      else if (bytesPerPixel > 1) quality = 75;
      else quality = 65;
    }

    // Consider format
    if (metadata.format === 'png' || metadata.format === 'tiff') {
      quality = Math.min(95, quality + 10);
    }

    return Math.max(0, Math.min(100, quality));
  }

  /**
   * Extract dominant colors from image stats
   */
  private extractDominantColors(dominant: any): string[] {
    // This is a simplified implementation
    // In a real implementation, would use more sophisticated color analysis
    return [
      `rgb(${Math.round(dominant.r * 255)}, ${Math.round(dominant.g * 255)}, ${Math.round(dominant.b * 255)})`
    ];
  }

  /**
   * Determine image complexity
   */
  private determineImageComplexity(metadata: sharp.Metadata): 'simple' | 'moderate' | 'complex' {
    const pixelCount = (metadata.width || 0) * (metadata.height || 0);
    
    if (pixelCount < 500000) return 'simple';
    if (pixelCount < 2000000) return 'moderate';
    return 'complex';
  }

  /**
   * Recommend optimal format based on analysis
   */
  private recommendFormat(analysis: ContentAnalysis): string {
    if (analysis.hasTransparency) {
      return 'png';
    }
    
    if (analysis.complexity === 'simple') {
      return 'webp';
    }
    
    if (analysis.estimatedQuality > 90) {
      return 'png';
    }
    
    return 'jpg';
  }

  /**
   * Generate compression configuration based on analysis
   */
  private generateCompressionConfig(analysis: ContentAnalysis): CompressionConfig {
    let quality = 85;
    let level: 'low' | 'medium' | 'high' | 'maximum' = 'medium';

    switch (analysis.complexity) {
      case 'simple':
        quality = 75;
        level = 'high';
        break;
      case 'moderate':
        quality = 85;
        level = 'medium';
        break;
      case 'complex':
        quality = 90;
        level = 'low';
        break;
    }

    return {
      contentType: 'image',
      quality,
      preserveMetadata: false,
      compressionLevel: level
    };
  }

  /**
   * Calculate bandwidth savings
   */
  private calculateBandwidthSavings(originalSize: number, compressedSize: number): number {
    return ((originalSize - compressedSize) / originalSize) * 100;
  }

  /**
   * Estimate quality loss
   */
  private estimateQualityLoss(quality: number, optimizations: AIOptimization[]): number {
    let loss = (100 - quality) * 0.5; // Base quality loss
    
    optimizations.forEach(opt => {
      switch (opt.type) {
        case 'color_reduction':
          loss += 5 * (1 - opt.confidence);
          break;
        case 'spatial_compression':
          loss += 3 * (1 - opt.confidence);
          break;
      }
    });

    return Math.max(0, Math.min(100, loss));
  }

  /**
   * Get compression profile
   */
  getCompressionProfile(name: string): CompressionProfile | null {
    return this.compressionProfiles.get(name) || null;
  }

  /**
   * Get all compression profiles
   */
  getCompressionProfiles(): CompressionProfile[] {
    return Array.from(this.compressionProfiles.values());
  }

  /**
   * Add custom compression profile
   */
  addCompressionProfile(profile: CompressionProfile): void {
    this.compressionProfiles.set(profile.name, profile);
    logger.info(`Added compression profile: ${profile.name}`);
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): {
    totalCompressions: number;
    averageCompressionRatio: number;
    totalBandwidthSaved: number;
    averageProcessingTime: number;
  } {
    // In a real implementation, this would track actual statistics
    return {
      totalCompressions: 0,
      averageCompressionRatio: 0,
      totalBandwidthSaved: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    this.eventEmitter.removeAllListeners();
    logger.info('Intelligent compression service destroyed');
  }
}

/**
 * AI Compression Model for generating intelligent optimizations
 */
class AICompressionModel {
  /**
   * Generate AI-powered optimizations for compression
   */
  async generateOptimizations(
    analysis: ContentAnalysis,
    config: CompressionConfig
  ): Promise<AIOptimization[]> {
    const optimizations: AIOptimization[] = [];

    // Color reduction optimization
    if (analysis.contentType === 'image' && analysis.complexity === 'simple') {
      optimizations.push({
        type: 'color_reduction',
        confidence: 0.8,
        impact: 'Reduces file size by reducing color depth',
        parameters: {
          reduction: 0.9
        }
      });
    }

    // Spatial compression optimization
    if (analysis.contentType === 'image' && config.compressionLevel === 'maximum') {
      optimizations.push({
        type: 'spatial_compression',
        confidence: 0.7,
        impact: 'Reduces resolution for significant size savings',
        parameters: {
          resizeFactor: 0.8
        }
      });
    }

    // Frequency optimization for complex images
    if (analysis.complexity === 'complex') {
      optimizations.push({
        type: 'frequency_optimization',
        confidence: 0.6,
        impact: 'Optimizes frequency domain for better compression',
        parameters: {
          sharpen: true
        }
      });
    }

    return optimizations;
  }
}
