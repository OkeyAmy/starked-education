import axios from 'axios';
import { Redis } from 'ioredis';
import crypto from 'crypto';

export interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
  contentType?: 'course' | 'subtitle' | 'interaction' | 'general';
}

export interface TranslationResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  qualityScore: number;
  translationTime: number;
  isCached: boolean;
}

export interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
  translatedText?: string;
}

interface TranslationCache {
  hash: string;
  translation: string;
  qualityScore: number;
  timestamp: Date;
  usageCount: number;
}

interface QualityMetrics {
  totalTranslations: number;
  averageQualityScore: number;
  averageConfidence: number;
  averageTranslationTime: number;
  cacheHitRate: number;
  correctionsCount: number;
}

export class RealTimeTranslationService {
  private redis: Redis | null = null;
  private apiKey: string;
  private apiEndpoint: string;
  private qualityThreshold: number = 0.85;
  private cacheEnabled: boolean = true;
  private metrics: Map<string, QualityMetrics> = new Map();

  constructor() {
    this.apiKey = process.env.TRANSLATION_API_KEY || '';
    this.apiEndpoint = process.env.TRANSLATION_API_ENDPOINT || 'https://api.deepl.com/v2/translate';
    
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379');
    
    try {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD || undefined,
      });
    } catch (error) {
      console.warn('Redis not available, caching disabled');
      this.cacheEnabled = false;
    }
  }

  /**
   * Translate text with context awareness
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(request);
    
    // Check cache first
    if (this.cacheEnabled) {
      const cached = await this.getCachedTranslation(cacheKey);
      if (cached) {
        return {
          translatedText: cached.translation,
          sourceLanguage: request.sourceLanguage,
          targetLanguage: request.targetLanguage,
          confidence: 1.0,
          qualityScore: cached.qualityScore,
          translationTime: Date.now() - startTime,
          isCached: true,
        };
      }
    }

    try {
      // Prepare request with context
      const payload = this.prepareTranslationPayload(request);
      
      // Call translation API
      const response = await axios.post(
        this.apiEndpoint,
        payload,
        {
          headers: {
            'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 3000, // 3 second timeout for real-time requirement
        }
      );

      const translatedText = response.data.translations[0].text;
      
      // Calculate quality score
      const qualityScore = await this.calculateQualityScore(
        request.text,
        translatedText,
        request.context
      );

      // Cache the translation
      if (this.cacheEnabled && qualityScore >= this.qualityThreshold) {
        await this.cacheTranslation(cacheKey, translatedText, qualityScore);
      }

      // Update metrics
      await this.updateMetrics(request, {
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: response.data.confidence || 0.95,
        qualityScore,
        translationTime: Date.now() - startTime,
        isCached: false,
      });

      return {
        translatedText,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        confidence: response.data.confidence || 0.95,
        qualityScore,
        translationTime: Date.now() - startTime,
        isCached: false,
      };
    } catch (error: any) {
      console.error('Translation error:', error.message);
      
      // Fallback to alternative provider or cached similar translations
      const fallbackTranslation = await this.getFallbackTranslation(request);
      if (fallbackTranslation) {
        return fallbackTranslation;
      }

      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Batch translate multiple texts (optimized for course content)
   */
  async batchTranslate(
    requests: TranslationRequest[],
    batchSize: number = 10
  ): Promise<TranslationResponse[]> {
    const results: TranslationResponse[] = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const promises = batch.map(req => this.translate(req));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Translate and synchronize subtitles
   */
  async translateSubtitles(
    segments: SubtitleSegment[],
    targetLanguage: string
  ): Promise<SubtitleSegment[]> {
    const translatedSegments: SubtitleSegment[] = [];
    
    // Group segments by proximity for better context
    const groups = this.groupSubtitleSegments(segments);
    
    for (const group of groups) {
      const combinedText = group.map(s => s.text).join(' ');
      
      const translation = await this.translate({
        text: combinedText,
        sourceLanguage: 'en',
        targetLanguage,
        contentType: 'subtitle',
      });
      
      // Distribute translation back to segments
      const translatedParts = this.distributeTranslation(
        translation.translatedText,
        group
      );
      
      for (let i = 0; i < group.length; i++) {
        translatedSegments.push({
          ...group[i],
          translatedText: translatedParts[i],
        });
      }
    }
    
    return translatedSegments;
  }

  /**
   * Submit a correction for quality improvement
   */
  async submitCorrection(
    originalText: string,
    translation: string,
    correctedTranslation: string,
    context?: string
  ): Promise<void> {
    const correction = {
      originalText,
      translation,
      correctedTranslation,
      context,
      timestamp: new Date().toISOString(),
    };

    // Store in database for later analysis
    if (this.redis) {
      await this.redis.lpush(
        'translation:corrections',
        JSON.stringify(correction)
      );
      await this.redis.ltrim('translation:corrections', 0, 9999); // Keep last 10k
    }

    // Update quality metrics
    this.updateQualityAfterCorrection(originalText, translation);
  }

  /**
   * Get translation quality metrics
   */
  async getQualityMetrics(contentType?: string): Promise<QualityMetrics> {
    if (contentType && this.metrics.has(contentType)) {
      return this.metrics.get(contentType)!;
    }

    // Aggregate all metrics
    const allMetrics = Array.from(this.metrics.values());
    if (allMetrics.length === 0) {
      return this.getDefaultMetrics();
    }

    return {
      totalTranslations: allMetrics.reduce((sum, m) => sum + m.totalTranslations, 0),
      averageQualityScore: this.average(allMetrics.map(m => m.averageQualityScore)),
      averageConfidence: this.average(allMetrics.map(m => m.averageConfidence)),
      averageTranslationTime: this.average(allMetrics.map(m => m.averageTranslationTime)),
      cacheHitRate: this.average(allMetrics.map(m => m.cacheHitRate)),
      correctionsCount: allMetrics.reduce((sum, m) => sum + m.correctionsCount, 0),
    };
  }

  /**
   * Analyze context for improved accuracy
   */
  private analyzeContext(context: string | undefined): {
    domain?: string;
    tone?: string;
    terminology?: string[];
  } {
    if (!context) {
      return {};
    }

    // Simple keyword-based context analysis
    const educationalTerms = ['course', 'lesson', 'exam', 'student', 'teacher', 'grade'];
    const technicalTerms = ['API', 'blockchain', 'smart contract', 'code', 'programming'];
    
    const domain = educationalTerms.some(term => context.toLowerCase().includes(term))
      ? 'education'
      : technicalTerms.some(term => context.toLowerCase().includes(term))
      ? 'technology'
      : undefined;

    return {
      domain,
      tone: 'formal', // Default to formal for educational content
    };
  }

  /**
   * Prepare translation payload for API
   */
  private prepareTranslationPayload(request: TranslationRequest): any {
    const contextAnalysis = this.analyzeContext(request.context);
    
    return {
      text: [request.text],
      source_lang: request.sourceLanguage.toUpperCase(),
      target_lang: request.targetLanguage.toUpperCase(),
      formality: 'default',
      tag_handling: 'html', // Preserve HTML tags in course content
      context: request.context,
      glossary_id: this.getGlossaryId(request.contentType, contextAnalysis.domain),
    };
  }

  /**
   * Calculate quality score for translation
   */
  private async calculateQualityScore(
    original: string,
    translated: string,
    context?: string
  ): Promise<number> {
    let score = 0.9; // Base score
    
    // Length ratio check (should be similar)
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.5 || lengthRatio > 2.0) {
      score -= 0.1;
    }
    
    // Check for common translation issues
    if (translated.includes('[...]') || translated.includes('...')) {
      score -= 0.2;
    }
    
    // Context relevance (simplified)
    if (context) {
      const contextWords = context.split(' ').filter(w => w.length > 3);
      const matches = contextWords.filter(w => 
        translated.toLowerCase().includes(w.toLowerCase())
      );
      if (matches.length > 0) {
        score += 0.05;
      }
    }
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: TranslationRequest): string {
    const key = `${request.text}:${request.sourceLanguage}:${request.targetLanguage}:${request.context || ''}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get cached translation
   */
  private async getCachedTranslation(cacheKey: string): Promise<TranslationCache | null> {
    if (!this.redis) return null;
    
    const cached = await this.redis.get(`translation:${cacheKey}`);
    if (!cached) return null;
    
    const data = JSON.parse(cached);
    
    // Check if cache is still fresh (less than 30 days old)
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > 30 * 24 * 60 * 60 * 1000) {
      await this.redis.del(`translation:${cacheKey}`);
      return null;
    }
    
    return data;
  }

  /**
   * Cache translation
   */
  private async cacheTranslation(
    cacheKey: string,
    translation: string,
    qualityScore: number
  ): Promise<void> {
    if (!this.redis) return;
    
    const cacheData: TranslationCache = {
      hash: cacheKey,
      translation,
      qualityScore,
      timestamp: new Date(),
      usageCount: 1,
    };
    
    await this.redis.setex(
      `translation:${cacheKey}`,
      30 * 24 * 60 * 60, // 30 days
      JSON.stringify(cacheData)
    );
  }

  /**
   * Get fallback translation (alternative provider or similar)
   */
  private async getFallbackTranslation(request: TranslationRequest): Promise<TranslationResponse | null> {
    // Try to find similar cached translation
    if (this.redis) {
      const pattern = `translation:*:${request.sourceLanguage}:${request.targetLanguage}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        // Return first cached translation as fallback
        const cached = await this.redis.get(keys[0]);
        if (cached) {
          const data = JSON.parse(cached);
          return {
            translatedText: data.translation,
            sourceLanguage: request.sourceLanguage,
            targetLanguage: request.targetLanguage,
            confidence: 0.7,
            qualityScore: data.qualityScore * 0.8,
            translationTime: 0,
            isCached: true,
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Update quality metrics
   */
  private async updateMetrics(
    request: TranslationRequest,
    response: TranslationResponse
  ): Promise<void> {
    const contentType = request.contentType || 'general';
    
    if (!this.metrics.has(contentType)) {
      this.metrics.set(contentType, this.getDefaultMetrics());
    }
    
    const metrics = this.metrics.get(contentType)!;
    const n = metrics.totalTranslations;
    
    metrics.totalTranslations += 1;
    metrics.averageQualityScore = ((metrics.averageQualityScore * n) + response.qualityScore) / (n + 1);
    metrics.averageConfidence = ((metrics.averageConfidence * n) + response.confidence) / (n + 1);
    metrics.averageTranslationTime = ((metrics.averageTranslationTime * n) + response.translationTime) / (n + 1);
    
    if (response.isCached) {
      metrics.cacheHitRate = ((metrics.cacheHitRate * n) + 1) / (n + 1);
    }
  }

  /**
   * Update quality after correction
   */
  private updateQualityAfterCorrection(originalText: string, translation: string): void {
    // Find and penalize low-quality cache entries
    const cacheKey = this.generateCacheKey({
      text: originalText,
      sourceLanguage: 'en',
      targetLanguage: 'unknown',
    });
    
    if (this.redis) {
      this.redis.del(`translation:${cacheKey}`);
    }
  }

  /**
   * Group subtitle segments for better context
   */
  private groupSubtitleSegments(segments: SubtitleSegment[]): SubtitleSegment[][] {
    const groups: SubtitleSegment[][] = [];
    let currentGroup: SubtitleSegment[] = [];
    let lastEndTime = 0;
    
    for (const segment of segments) {
      // New group if gap > 2 seconds
      if (segment.startTime - lastEndTime > 2000 && currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      
      currentGroup.push(segment);
      lastEndTime = segment.endTime;
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }

  /**
   * Distribute combined translation back to segments
   */
  private distributeTranslation(combined: string, segments: SubtitleSegment[]): string[] {
    // Simple distribution by character count ratio
    const totalOriginalLength = segments.reduce((sum, s) => sum + s.text.length, 0);
    const parts: string[] = [];
    let startIndex = 0;
    
    for (const segment of segments) {
      const ratio = segment.text.length / totalOriginalLength;
      const partLength = Math.floor(combined.length * ratio);
      const endIndex = Math.min(startIndex + partLength, combined.length);
      
      parts.push(combined.substring(startIndex, endIndex));
      startIndex = endIndex;
    }
    
    // Handle remainder
    if (startIndex < combined.length) {
      parts[parts.length - 1] += combined.substring(startIndex);
    }
    
    return parts;
  }

  /**
   * Get glossary ID for specific domain/content type
   */
  private getGlossaryId(contentType?: string, domain?: string): string | undefined {
    const glossaries: Record<string, string> = {
      'course-education': process.env.GLOSSARY_EDUCATION_ID || '',
      'course-technology': process.env.GLOSSARY_TECH_ID || '',
      'subtitle-general': process.env.GLOSSARY_SUBTITLE_ID || '',
    };
    
    const key = `${contentType || 'general'}-${domain || 'general'}`;
    return glossaries[key] || undefined;
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): QualityMetrics {
    return {
      totalTranslations: 0,
      averageQualityScore: 0,
      averageConfidence: 0,
      averageTranslationTime: 0,
      cacheHitRate: 0,
      correctionsCount: 0,
    };
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

export const realTimeTranslationService = new RealTimeTranslationService();
