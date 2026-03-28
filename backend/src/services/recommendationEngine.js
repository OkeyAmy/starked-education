/**
 * Real-time Recommendation Engine Service
 * Integrates collaborative filtering and content-based recommendations
 */

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const redis = require('redis');
const { promisify } = require('util');

class RecommendationEngineService {
    constructor() {
        this.pythonScriptPath = path.join(__dirname, '../ml/recommendation_service.py');
        this.models = {
            collaborative: null,
            contentBased: null,
            hybrid: null
        };
        this.isInitialized = false;
        this.cache = new Map();
        
        // Initialize Redis for caching
        this.initializeRedis();
        
        // Configuration
        this.config = {
            cacheTimeout: 300000, // 5 minutes
            maxRecommendations: 50,
            defaultRecommendationCount: 10,
            pythonTimeout: 30000, // 30 seconds
            enableRealTimeUpdates: true,
            enableABTesting: true
        };
    }

    async initializeRedis() {
        try {
            this.redisClient = redis.createClient({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                db: 3 // Separate DB for recommendations
            });
            
            this.redisClient.on('error', (err) => {
                console.error('Redis connection error:', err);
            });
            
            await this.redisClient.connect();
            console.log('Recommendation Engine: Redis connected');
        } catch (error) {
            console.warn('Redis not available for recommendations:', error.message);
            this.redisClient = null;
        }
    }

    /**
     * Initialize the recommendation engine
     */
    async initialize() {
        try {
            console.log('Initializing Recommendation Engine...');
            
            // Check if Python script exists
            try {
                await fs.access(this.pythonScriptPath);
            } catch (error) {
                console.error('Python recommendation script not found:', error);
                throw new Error('Python recommendation script not found');
            }
            
            // Initialize Python models
            await this.initializePythonModels();
            
            this.isInitialized = true;
            console.log('Recommendation Engine initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Recommendation Engine:', error);
            throw error;
        }
    }

    /**
     * Initialize Python ML models
     */
    async initializePythonModels() {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                this.pythonScriptPath,
                '--initialize'
            ]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        console.log('Python models initialized:', result);
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
                }
            });

            pythonProcess.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Get personalized recommendations for a user
     */
    async getRecommendations(userId, options = {}) {
        const {
            count = this.config.defaultRecommendationCount,
            algorithm = 'hybrid',
            includeExplanations = true,
            context = {}
        } = options;

        try {
            // Check cache first
            const cacheKey = `recs_${userId}_${algorithm}_${count}_${JSON.stringify(context)}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            if (!this.isInitialized) {
                await this.initialize();
            }

            // Call Python recommendation service
            const recommendations = await this.callPythonService('get_recommendations', {
                user_id: userId,
                count: count,
                algorithm: algorithm,
                include_explanations: includeExplanations,
                context: context
            });

            // Add metadata
            const result = {
                userId,
                recommendations: recommendations.recommendations || [],
                algorithm,
                generatedAt: new Date().toISOString(),
                metadata: {
                    totalRecommendations: recommendations.recommendations?.length || 0,
                    algorithm: algorithm,
                    context: context
                }
            };

            // Cache result
            await this.setCache(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Error getting recommendations:', error);
            throw new Error(`Failed to get recommendations: ${error.message}`);
        }
    }

    /**
     * Get similar courses to a given course
     */
    async getSimilarCourses(courseId, options = {}) {
        const {
            count = 10,
            algorithm = 'content_based'
        } = options;

        try {
            // Check cache
            const cacheKey = `similar_${courseId}_${count}_${algorithm}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            const similarCourses = await this.callPythonService('get_similar_courses', {
                course_id: courseId,
                count: count,
                algorithm: algorithm
            });

            const result = {
                courseId,
                similarCourses: similarCourses.similar_courses || [],
                algorithm,
                generatedAt: new Date().toISOString()
            };

            // Cache result
            await this.setCache(cacheKey, result);

            return result;

        } catch (error) {
            console.error('Error getting similar courses:', error);
            throw new Error(`Failed to get similar courses: ${error.message}`);
        }
    }

    /**
     * Update user profile with new interactions
     */
    async updateUserProfile(userId, interactions) {
        try {
            const result = await this.callPythonService('update_user_profile', {
                user_id: userId,
                interactions: interactions
            });

            // Clear user-specific cache
            await this.clearUserCache(userId);

            return result;

        } catch (error) {
            console.error('Error updating user profile:', error);
            throw new Error(`Failed to update user profile: ${error.message}`);
        }
    }

    /**
     * Get recommendation explanations
     */
    async getRecommendationExplanation(userId, courseId) {
        try {
            const explanation = await this.callPythonService('get_explanation', {
                user_id: userId,
                course_id: courseId
            });

            return {
                userId,
                courseId,
                explanation: explanation.explanation || {},
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting recommendation explanation:', error);
            throw new Error(`Failed to get explanation: ${error.message}`);
        }
    }

    /**
     * Get popular courses
     */
    async getPopularCourses(options = {}) {
        const {
            count = 20,
            category = null,
            timeRange = '7d'
        } = options;

        try {
            const cacheKey = `popular_${count}_${category}_${timeRange}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            const popularCourses = await this.callPythonService('get_popular_courses', {
                count: count,
                category: category,
                time_range: timeRange
            });

            const result = {
                courses: popularCourses.courses || [],
                category,
                timeRange,
                generatedAt: new Date().toISOString()
            };

            // Cache result (shorter timeout for popular courses)
            await this.setCache(cacheKey, result, 60000); // 1 minute

            return result;

        } catch (error) {
            console.error('Error getting popular courses:', error);
            throw new Error(`Failed to get popular courses: ${error.message}`);
        }
    }

    /**
     * Get trending courses
     */
    async getTrendingCourses(options = {}) {
        const {
            count = 20,
            category = null,
            timeRange = '24h'
        } = options;

        try {
            const cacheKey = `trending_${count}_${category}_${timeRange}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            const trendingCourses = await this.callPythonService('get_trending_courses', {
                count: count,
                category: category,
                time_range: timeRange
            });

            const result = {
                courses: trendingCourses.courses || [],
                category,
                timeRange,
                generatedAt: new Date().toISOString()
            };

            // Cache result (very short timeout for trending)
            await this.setCache(cacheKey, result, 30000); // 30 seconds

            return result;

        } catch (error) {
            console.error('Error getting trending courses:', error);
            throw new Error(`Failed to get trending courses: ${error.message}`);
        }
    }

    /**
     * Train recommendation models
     */
    async trainModels(options = {}) {
        const {
            algorithms = ['collaborative', 'content_based', 'hybrid'],
            forceRetrain = false
        } = options;

        try {
            console.log('Starting model training...');
            
            const trainingResult = await this.callPythonService('train_models', {
                algorithms: algorithms,
                force_retrain: forceRetrain
            });

            // Clear cache after training
            await this.clearAllCache();

            console.log('Model training completed:', trainingResult);
            return trainingResult;

        } catch (error) {
            console.error('Error training models:', error);
            throw new Error(`Failed to train models: ${error.message}`);
        }
    }

    /**
     * Evaluate model performance
     */
    async evaluateModels(options = {}) {
        const {
            algorithms = ['collaborative', 'content_based', 'hybrid'],
            metrics = ['precision', 'recall', 'ndcg']
        } = options;

        try {
            const evaluationResult = await this.callPythonService('evaluate_models', {
                algorithms: algorithms,
                metrics: metrics
            });

            return evaluationResult;

        } catch (error) {
            console.error('Error evaluating models:', error);
            throw new Error(`Failed to evaluate models: ${error.message}`);
        }
    }

    /**
     * Get recommendation statistics
     */
    async getStatistics(timeRange = '24h') {
        try {
            const stats = await this.callPythonService('get_statistics', {
                time_range: timeRange
            });

            return {
                timeRange,
                statistics: stats.statistics || {},
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting statistics:', error);
            throw new Error(`Failed to get statistics: ${error.message}`);
        }
    }

    /**
     * Call Python recommendation service
     */
    async callPythonService(action, data = {}) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [
                this.pythonScriptPath,
                '--action', action,
                '--data', JSON.stringify(data)
            ]);

            let output = '';
            let errorOutput = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            const timeout = setTimeout(() => {
                pythonProcess.kill();
                reject(new Error('Python process timeout'));
            }, this.config.pythonTimeout);

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                
                if (code === 0) {
                    try {
                        const result = JSON.parse(output);
                        resolve(result);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse Python output: ${parseError.message}`));
                    }
                } else {
                    reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
                }
            });

            pythonProcess.on('error', (error) => {
                clearTimeout(timeout);
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Cache management methods
     */
    async getFromCache(key) {
        // Check in-memory cache first
        const memoryCache = this.cache.get(key);
        if (memoryCache && Date.now() - memoryCache.timestamp < this.config.cacheTimeout) {
            return memoryCache.data;
        }

        // Check Redis cache
        if (this.redisClient) {
            try {
                const redisCache = await this.redisClient.get(key);
                if (redisCache) {
                    const data = JSON.parse(redisCache);
                    // Update memory cache
                    this.cache.set(key, {
                        data: data,
                        timestamp: Date.now()
                    });
                    return data;
                }
            } catch (error) {
                console.warn('Redis cache read error:', error.message);
            }
        }

        return null;
    }

    async setCache(key, data, timeout = this.config.cacheTimeout) {
        // Update memory cache
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });

        // Update Redis cache
        if (this.redisClient) {
            try {
                await this.redisClient.setEx(key, Math.ceil(timeout / 1000), JSON.stringify(data));
            } catch (error) {
                console.warn('Redis cache write error:', error.message);
            }
        }
    }

    async clearUserCache(userId) {
        // Clear memory cache entries for user
        for (const [key] of this.cache.entries()) {
            if (key.includes(`recs_${userId}`)) {
                this.cache.delete(key);
            }
        }

        // Clear Redis cache entries for user
        if (this.redisClient) {
            try {
                const keys = await this.redisClient.keys(`*recs_${userId}*`);
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                }
            } catch (error) {
                console.warn('Redis cache clear error:', error.message);
            }
        }
    }

    async clearAllCache() {
        // Clear memory cache
        this.cache.clear();

        // Clear Redis cache
        if (this.redisClient) {
            try {
                const keys = await this.redisClient.keys('*recs_*');
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                }
            } catch (error) {
                console.warn('Redis cache clear error:', error.message);
            }
        }
    }

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const pythonHealth = await this.callPythonService('health_check');
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                python: pythonHealth,
                redis: this.redisClient ? 'connected' : 'disconnected',
                cache: {
                    memorySize: this.cache.size,
                    timeout: this.config.cacheTimeout
                },
                initialized: this.isInitialized
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message
            };
        }
    }

    /**
     * Get system metrics
     */
    async getMetrics() {
        try {
            const stats = await this.getStatistics('1h');
            const health = await this.healthCheck();

            return {
                health,
                statistics: stats.statistics,
                cache: {
                    memorySize: this.cache.size,
                    redisConnected: this.redisClient ? true : false
                },
                config: {
                    cacheTimeout: this.config.cacheTimeout,
                    maxRecommendations: this.config.maxRecommendations,
                    pythonTimeout: this.config.pythonTimeout
                }
            };

        } catch (error) {
            console.error('Error getting metrics:', error);
            return {
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = new RecommendationEngineService();
