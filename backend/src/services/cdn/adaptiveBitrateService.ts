/**
 * Adaptive Bitrate Streaming Service
 * Implements HLS/DASH streaming protocols with dynamic quality adjustment
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import logger from '../../utils/logger';
import { QualityLevel } from './types';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export interface VideoStreamConfig {
  inputPath: string;
  outputDir: string;
  qualities: VideoQuality[];
  segmentDuration: number;
  encryptionEnabled?: boolean;
  encryptionKey?: string;
}

export interface VideoQuality {
  level: QualityLevel;
  bitrate: number; // in kbps
  resolution: {
    width: number;
    height: number;
  };
  videoCodec: string;
  audioCodec: string;
  frameRate: number;
}

export interface StreamSegment {
  quality: QualityLevel;
  index: number;
  duration: number;
  size: number;
  url: string;
  encrypted?: boolean;
}

export interface StreamManifest {
  type: 'hls' | 'dash';
  masterPlaylist: string;
  qualityPlaylists: Map<QualityLevel, string>;
  segments: Map<QualityLevel, StreamSegment[]>;
  encryptionKey?: string;
  totalDuration: number;
}

export interface NetworkCondition {
  bandwidth: number; // in kbps
  latency: number; // in ms
  packetLoss: number; // percentage 0-100
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface StreamSession {
  id: string;
  contentId: string;
  clientInfo: any;
  currentQuality: QualityLevel;
  networkCondition: NetworkCondition;
  startTime: Date;
  lastQualityChange: Date;
  bufferHealth: number;
  playbackPosition: number;
}

export class AdaptiveBitrateService {
  private eventEmitter: EventEmitter = new EventEmitter();
  private activeSessions: Map<string, StreamSession> = new Map();
  private streamManifests: Map<string, StreamManifest> = new Map();
  private networkMonitor: NetworkMonitor;

  constructor() {
    this.networkMonitor = new NetworkMonitor();
    this.initializeDefaultQualities();
  }

  /**
   * Initialize default video quality configurations
   */
  private initializeDefaultQualities(): void {
    // Default configurations are handled in the generateQualities method
  }

  /**
   * Generate adaptive bitrate streams for a video
   */
  async generateAdaptiveStreams(
    contentId: string,
    inputVideoPath: string,
    outputDir: string
  ): Promise<StreamManifest> {
    try {
      logger.info(`Generating adaptive streams for content: ${contentId}`);

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const qualities = this.generateQualities();
      const config: VideoStreamConfig = {
        inputPath: inputVideoPath,
        outputDir,
        qualities,
        segmentDuration: 6, // 6 seconds per segment
        encryptionEnabled: false
      };

      // Generate HLS streams
      const hlsManifest = await this.generateHLSStreams(contentId, config);

      // Generate DASH streams
      const dashManifest = await this.generateDASHStreams(contentId, config);

      // Store manifest
      this.streamManifests.set(contentId, hlsManifest);

      logger.info(`Successfully generated adaptive streams for ${contentId}`);
      this.eventEmitter.emit('streams:generated', { contentId, manifest: hlsManifest });

      return hlsManifest;
    } catch (error) {
      logger.error(`Error generating adaptive streams for ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Generate video quality configurations
   */
  private generateQualities(): VideoQuality[] {
    return [
      {
        level: QualityLevel.LOW,
        bitrate: 500,
        resolution: { width: 640, height: 360 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        frameRate: 30
      },
      {
        level: QualityLevel.MEDIUM,
        bitrate: 1500,
        resolution: { width: 1280, height: 720 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        frameRate: 30
      },
      {
        level: QualityLevel.HIGH,
        bitrate: 3000,
        resolution: { width: 1920, height: 1080 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        frameRate: 30
      },
      {
        level: QualityLevel.ULTRA,
        bitrate: 8000,
        resolution: { width: 3840, height: 2160 },
        videoCodec: 'h264',
        audioCodec: 'aac',
        frameRate: 30
      }
    ];
  }

  /**
   * Generate HLS streams
   */
  private async generateHLSStreams(
    contentId: string,
    config: VideoStreamConfig
  ): Promise<StreamManifest> {
    return new Promise((resolve, reject) => {
      const segments: Map<QualityLevel, StreamSegment[]> = new Map();
      const qualityPlaylists: Map<QualityLevel, string> = new Map();
      let totalDuration = 0;

      // Generate streams for each quality
      const streamPromises = config.qualities.map(quality => 
        this.generateHLSQualityStream(contentId, quality, config)
      );

      Promise.all(streamPromises)
        .then(results => {
          results.forEach((result, index) => {
            const quality = config.qualities[index];
            segments.set(quality.level, result.segments);
            qualityPlaylists.set(quality.level, result.playlistUrl);
            if (result.duration > totalDuration) {
              totalDuration = result.duration;
            }
          });

          // Generate master playlist
          const masterPlaylist = this.generateHLSMasterPlaylist(config.qualities, qualityPlaylists);

          const manifest: StreamManifest = {
            type: 'hls',
            masterPlaylist,
            qualityPlaylists,
            segments,
            totalDuration
          };

          resolve(manifest);
        })
        .catch(reject);
    });
  }

  /**
   * Generate HLS stream for specific quality
   */
  private async generateHLSQualityStream(
    contentId: string,
    quality: VideoQuality,
    config: VideoStreamConfig
  ): Promise<{ segments: StreamSegment[]; playlistUrl: string; duration: number }> {
    const qualityDir = path.join(config.outputDir, quality.level);
    if (!fs.existsSync(qualityDir)) {
      fs.mkdirSync(qualityDir, { recursive: true });
    }

    const playlistPath = path.join(qualityDir, `${quality.level}.m3u8`);
    const segmentPattern = path.join(qualityDir, 'segment%03d.ts');

    return new Promise((resolve, reject) => {
      ffmpeg(config.inputPath)
        .outputOptions([
          '-c:v', quality.videoCodec,
          '-c:a', quality.audioCodec,
          '-b:v', `${quality.bitrate}k`,
          '-s', `${quality.resolution.width}x${quality.resolution.height}`,
          '-r', quality.frameRate.toString(),
          '-f', 'hls',
          '-hls_time', config.segmentDuration.toString(),
          '-hls_playlist_type', 'vod',
          '-hls_segment_filename', segmentPattern
        ])
        .output(playlistPath)
        .on('end', () => {
          // Read segments and create segment info
          const segments = this.analyzeHLSSegments(qualityDir, quality.level, config.segmentDuration);
          resolve({
            segments,
            playlistUrl: `/streams/${contentId}/${quality.level}/${quality.level}.m3u8`,
            duration: segments.length * config.segmentDuration
          });
        })
        .on('error', (error) => {
          logger.error(`Error generating HLS stream for ${quality.level}:`, error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Analyze HLS segments to create segment metadata
   */
  private analyzeHLSSegments(
    qualityDir: string,
    qualityLevel: QualityLevel,
    segmentDuration: number
  ): StreamSegment[] {
    const segments: StreamSegment[] = [];
    const segmentFiles = fs.readdirSync(qualityDir).filter(file => file.endsWith('.ts'));

    segmentFiles.forEach((file, index) => {
      const filePath = path.join(qualityDir, file);
      const stats = fs.statSync(filePath);

      segments.push({
        quality: qualityLevel,
        index,
        duration: segmentDuration,
        size: stats.size,
        url: `/streams/${path.basename(qualityDir)}/${file}`
      });
    });

    return segments.sort((a, b) => a.index - b.index);
  }

  /**
   * Generate HLS master playlist
   */
  private generateHLSMasterPlaylist(
    qualities: VideoQuality[],
    qualityPlaylists: Map<QualityLevel, string>
  ): string {
    let playlist = '#EXTM3U\n#EXT-X-VERSION:6\n';

    qualities.forEach(quality => {
      const playlistUrl = qualityPlaylists.get(quality.level);
      if (playlistUrl) {
        playlist += `#EXT-X-STREAM-INF:BANDWIDTH=${quality.bitrate * 1000},`;
        playlist += `RESOLUTION=${quality.resolution.width}x${quality.resolution.height},`;
        playlist += `CODECS="${quality.videoCodec},${quality.audioCodec}"\n`;
        playlist += `${playlistUrl}\n`;
      }
    });

    return playlist;
  }

  /**
   * Generate DASH streams
   */
  private async generateDASHStreams(
    contentId: string,
    config: VideoStreamConfig
  ): Promise<StreamManifest> {
    return new Promise((resolve, reject) => {
      const outputPath = path.join(config.outputDir, 'manifest.mpd');

      ffmpeg(config.inputPath)
        .outputOptions([
          '-f', 'dash',
          '-seg_duration', config.segmentDuration.toString(),
          '-adaptation_sets', 'id=0,streams=v id=1,streams=a'
        ])
        .output(outputPath)
        .on('end', () => {
          const manifest: StreamManifest = {
            type: 'dash',
            masterPlaylist: `/streams/${contentId}/manifest.mpd`,
            qualityPlaylists: new Map(),
            segments: new Map(),
            totalDuration: 0
          };

          resolve(manifest);
        })
        .on('error', (error) => {
          logger.error('Error generating DASH streams:', error);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Start adaptive streaming session
   */
  async startStreamSession(
    contentId: string,
    clientInfo: any,
    initialQuality: QualityLevel = QualityLevel.AUTO
  ): Promise<StreamSession> {
    const sessionId = this.generateSessionId();
    const networkCondition = await this.networkMonitor.assessNetworkCondition(clientInfo);

    const session: StreamSession = {
      id: sessionId,
      contentId,
      clientInfo,
      currentQuality: this.selectOptimalQuality(networkCondition, initialQuality),
      networkCondition,
      startTime: new Date(),
      lastQualityChange: new Date(),
      bufferHealth: 100,
      playbackPosition: 0
    };

    this.activeSessions.set(sessionId, session);

    // Start monitoring for quality adjustments
    this.startQualityMonitoring(session);

    logger.info(`Started stream session: ${sessionId} for content: ${contentId}`);
    this.eventEmitter.emit('session:started', session);

    return session;
  }

  /**
   * Select optimal quality based on network conditions
   */
  private selectOptimalQuality(
    networkCondition: NetworkCondition,
    requestedQuality: QualityLevel
  ): QualityLevel {
    if (requestedQuality !== QualityLevel.AUTO) {
      // Check if requested quality is suitable for network conditions
      const qualityBandwidth = this.getRequiredBandwidth(requestedQuality);
      if (networkCondition.bandwidth >= qualityBandwidth * 1.2) {
        return requestedQuality;
      }
    }

    // Auto-select based on network conditions
    switch (networkCondition.quality) {
      case 'excellent':
        return QualityLevel.ULTRA;
      case 'good':
        return QualityLevel.HIGH;
      case 'fair':
        return QualityLevel.MEDIUM;
      case 'poor':
        return QualityLevel.LOW;
      default:
        return QualityLevel.MEDIUM;
    }
  }

  /**
   * Get required bandwidth for quality level
   */
  private getRequiredBandwidth(quality: QualityLevel): number {
    switch (quality) {
      case QualityLevel.LOW:
        return 800; // kbps
      case QualityLevel.MEDIUM:
        return 2000;
      case QualityLevel.HIGH:
        return 4000;
      case QualityLevel.ULTRA:
        return 10000;
      default:
        return 2000;
    }
  }

  /**
   * Start quality monitoring for a session
   */
  private startQualityMonitoring(session: StreamSession): void {
    const monitorInterval = setInterval(async () => {
      try {
        // Reassess network conditions
        const currentNetworkCondition = await this.networkMonitor.assessNetworkCondition(session.clientInfo);
        
        // Check if quality adjustment is needed
        const optimalQuality = this.selectOptimalQuality(currentNetworkCondition, QualityLevel.AUTO);
        
        if (optimalQuality !== session.currentQuality) {
          await this.adjustQuality(session, optimalQuality);
        }

        // Update session network condition
        session.networkCondition = currentNetworkCondition;

        this.eventEmitter.emit('session:monitored', session);
      } catch (error) {
        logger.error(`Error monitoring session ${session.id}:`, error);
      }
    }, 5000); // Monitor every 5 seconds

    // Store interval ID for cleanup
    (session as any).monitorInterval = monitorInterval;
  }

  /**
   * Adjust stream quality
   */
  private async adjustQuality(session: StreamSession, newQuality: QualityLevel): Promise<void> {
    const oldQuality = session.currentQuality;
    session.currentQuality = newQuality;
    session.lastQualityChange = new Date();

    logger.info(`Adjusted quality for session ${session.id}: ${oldQuality} -> ${newQuality}`);
    this.eventEmitter.emit('quality:changed', {
      sessionId: session.id,
      oldQuality,
      newQuality,
      timestamp: new Date()
    });
  }

  /**
   * Get stream manifest for content
   */
  getStreamManifest(contentId: string): StreamManifest | null {
    return this.streamManifests.get(contentId) || null;
  }

  /**
   * Get active stream session
   */
  getStreamSession(sessionId: string): StreamSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * End stream session
   */
  async endStreamSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Clear monitoring interval
    const monitorInterval = (session as any).monitorInterval;
    if (monitorInterval) {
      clearInterval(monitorInterval);
    }

    this.activeSessions.delete(sessionId);

    logger.info(`Ended stream session: ${sessionId}`);
    this.eventEmitter.emit('session:ended', session);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get streaming statistics
   */
  getStreamingStats(): {
    activeSessions: number;
    totalContent: number;
    averageQuality: string;
  } {
    const qualityCounts = new Map<QualityLevel, number>();
    
    this.activeSessions.forEach(session => {
      const count = qualityCounts.get(session.currentQuality) || 0;
      qualityCounts.set(session.currentQuality, count + 1);
    });

    const mostCommonQuality = Array.from(qualityCounts.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || QualityLevel.MEDIUM;

    return {
      activeSessions: this.activeSessions.size,
      totalContent: this.streamManifests.size,
      averageQuality: mostCommonQuality
    };
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    // End all active sessions
    const sessionIds = Array.from(this.activeSessions.keys());
    sessionIds.forEach(sessionId => {
      this.endStreamSession(sessionId);
    });

    this.eventEmitter.removeAllListeners();
    logger.info('Adaptive bitrate service destroyed');
  }
}

/**
 * Network Monitor for assessing network conditions
 */
class NetworkMonitor {
  /**
   * Assess network condition based on client info
   */
  async assessNetworkCondition(clientInfo: any): Promise<NetworkCondition> {
    // In a real implementation, this would perform actual network tests
    // For now, estimate based on connection type and device
    
    let bandwidth = 1000; // Default 1 Mbps
    let latency = 100; // Default 100ms
    let packetLoss = 0; // Default 0%

    switch (clientInfo.connectionType) {
      case 'wifi':
        bandwidth = 5000 + Math.random() * 10000; // 5-15 Mbps
        latency = 20 + Math.random() * 50; // 20-70ms
        packetLoss = Math.random() * 2; // 0-2%
        break;
      case 'cellular':
        bandwidth = 1000 + Math.random() * 9000; // 1-10 Mbps
        latency = 50 + Math.random() * 100; // 50-150ms
        packetLoss = Math.random() * 5; // 0-5%
        break;
      case 'ethernet':
        bandwidth = 10000 + Math.random() * 20000; // 10-30 Mbps
        latency = 10 + Math.random() * 30; // 10-40ms
        packetLoss = Math.random() * 1; // 0-1%
        break;
    }

    const quality = this.determineQuality(bandwidth, latency, packetLoss);

    return {
      bandwidth: Math.round(bandwidth),
      latency: Math.round(latency),
      packetLoss: Math.round(packetLoss * 100) / 100,
      quality
    };
  }

  /**
   * Determine network quality based on metrics
   */
  private determineQuality(
    bandwidth: number,
    latency: number,
    packetLoss: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (bandwidth > 10000 && latency < 50 && packetLoss < 1) {
      return 'excellent';
    } else if (bandwidth > 5000 && latency < 100 && packetLoss < 2) {
      return 'good';
    } else if (bandwidth > 2000 && latency < 200 && packetLoss < 5) {
      return 'fair';
    } else {
      return 'poor';
    }
  }
}
