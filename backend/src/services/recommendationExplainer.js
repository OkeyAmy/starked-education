/**
 * Recommendation Explanation and Transparency Service
 * Provides explainable AI for recommendation systems
 */

const crypto = require('crypto');
const redis = require('redis');

class RecommendationExplainer {
    constructor() {
        this.redisClient = null;
        this.explanationCache = new Map();
        
        // Configuration
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            redisDb: 6, // Separate DB for explanations
            cacheTimeout: 60 * 60 * 1000, // 1 hour
            maxExplanations: 10
        };
        
        this.initializeRedis();
    }

    async initializeRedis() {
        try {
            this.redisClient = redis.createClient({
                host: this.config.redisHost,
                port: this.config.redisPort,
                password: this.config.redisPassword,
                db: this.config.redisDb
            });
            
            this.redisClient.on('error', (err) => {
                console.error('Recommendation Explainer Redis connection error:', err);
            });
            
            await this.redisClient.connect();
            console.log('Recommendation Explainer: Redis connected');
        } catch (error) {
            console.warn('Recommendation Explainer: Redis not available, using in-memory storage:', error.message);
            this.redisClient = null;
        }
    }

    /**
     * Generate comprehensive explanation for recommendation
     */
    async explainRecommendation(userId, courseId, recommendationData = {}) {
        try {
            const cacheKey = `explanation:${userId}:${courseId}`;
            
            // Check cache first
            const cachedExplanation = await this.getFromCache(cacheKey);
            if (cachedExplanation) {
                return cachedExplanation;
            }

            const explanation = {
                userId,
                courseId,
                timestamp: new Date().toISOString(),
                overallScore: 0,
                confidence: 0,
                factors: [],
                similarUsers: [],
                similarCourses: [],
                userPreferences: {},
                contentAnalysis: {},
                transparency: {
                    algorithm: recommendationData.algorithm || 'hybrid',
                    dataUsed: [],
                    modelVersion: '1.0',
                    lastUpdated: new Date().toISOString()
                }
            };

            // Generate different types of explanations
            await Promise.all([
                this.generateCollaborativeExplanation(userId, courseId, explanation),
                this.generateContentBasedExplanation(userId, courseId, explanation),
                this.generateUserPreferenceExplanation(userId, courseId, explanation),
                this.generatePopularityExplanation(courseId, explanation),
                this.generateDiversityExplanation(userId, courseId, explanation)
            ]);

            // Calculate overall score and confidence
            explanation.overallScore = this.calculateOverallScore(explanation.factors);
            explanation.confidence = this.calculateConfidence(explanation.factors);

            // Sort factors by importance
            explanation.factors.sort((a, b) => b.importance - a.importance);

            // Generate human-readable summary
            explanation.summary = this.generateSummary(explanation);

            // Cache explanation
            await this.setCache(cacheKey, explanation);

            return explanation;

        } catch (error) {
            console.error('Error generating recommendation explanation:', error);
            throw error;
        }
    }

    /**
     * Generate collaborative filtering explanation
     */
    async generateCollaborativeExplanation(userId, courseId, explanation) {
        try {
            // Simulate finding similar users
            const similarUsers = await this.findSimilarUsers(userId, courseId);
            
            if (similarUsers.length > 0) {
                const factor = {
                    type: 'collaborative_filtering',
                    name: 'Similar Users',
                    description: `Recommended because ${similarUsers.length} users with similar tastes also liked this course`,
                    importance: this.calculateImportance(similarUsers.length, 0.8),
                    confidence: 0.75,
                    details: {
                        similarUsers: similarUsers.slice(0, 5),
                        averageRating: this.calculateAverageRating(similarUsers),
                        overlapPercentage: this.calculateOverlap(similarUsers)
                    }
                };

                explanation.factors.push(factor);
                explanation.similarUsers = similarUsers.slice(0, 5);
            }

        } catch (error) {
            console.error('Error generating collaborative explanation:', error);
        }
    }

    /**
     * Generate content-based explanation
     */
    async generateContentBasedExplanation(userId, courseId, explanation) {
        try {
            // Simulate content analysis
            const contentAnalysis = await this.analyzeCourseContent(userId, courseId);
            
            if (contentAnalysis.matchScore > 0.3) {
                const factor = {
                    type: 'content_based',
                    name: 'Content Similarity',
                    description: `Recommended because this course matches your interests in ${contentAnalysis.matchedTopics.join(', ')}`,
                    importance: this.calculateImportance(contentAnalysis.matchScore, 0.9),
                    confidence: contentAnalysis.matchScore,
                    details: {
                        matchedTopics: contentAnalysis.matchedTopics,
                        matchScore: contentAnalysis.matchScore,
                        skillAlignment: contentAnalysis.skillAlignment,
                        difficultyMatch: contentAnalysis.difficultyMatch
                    }
                };

                explanation.factors.push(factor);
                explanation.contentAnalysis = contentAnalysis;
            }

        } catch (error) {
            console.error('Error generating content-based explanation:', error);
        }
    }

    /**
     * Generate user preference explanation
     */
    async generateUserPreferenceExplanation(userId, courseId, explanation) {
        try {
            const userPreferences = await this.getUserPreferences(userId);
            const courseInfo = await this.getCourseInfo(courseId);
            
            const preferenceMatches = [];

            // Check category preference
            if (userPreferences.categories[courseInfo.category]) {
                preferenceMatches.push({
                    type: 'category',
                    preference: courseInfo.category,
                    strength: userPreferences.categories[courseInfo.category]
                });
            }

            // Check difficulty preference
            if (userPreferences.difficulty[courseInfo.difficulty]) {
                preferenceMatches.push({
                    type: 'difficulty',
                    preference: courseInfo.difficulty,
                    strength: userPreferences.difficulty[courseInfo.difficulty]
                });
            }

            // Check instructor preference
            if (userPreferences.instructors[courseInfo.instructor]) {
                preferenceMatches.push({
                    type: 'instructor',
                    preference: courseInfo.instructor,
                    strength: userPreferences.instructors[courseInfo.instructor]
                });
            }

            if (preferenceMatches.length > 0) {
                const factor = {
                    type: 'user_preferences',
                    name: 'Your Preferences',
                    description: `Recommended because it matches your learning preferences`,
                    importance: this.calculateImportance(
                        preferenceMatches.reduce((sum, match) => sum + match.strength, 0) / preferenceMatches.length,
                        0.85
                    ),
                    confidence: 0.8,
                    details: {
                        matches: preferenceMatches,
                        overallMatch: preferenceMatches.reduce((sum, match) => sum + match.strength, 0) / preferenceMatches.length
                    }
                };

                explanation.factors.push(factor);
                explanation.userPreferences = preferenceMatches;
            }

        } catch (error) {
            console.error('Error generating user preference explanation:', error);
        }
    }

    /**
     * Generate popularity explanation
     */
    async generatePopularityExplanation(courseId, explanation) {
        try {
            const popularityData = await this.getCoursePopularity(courseId);
            
            if (popularityData.score > 0.5) {
                const factor = {
                    type: 'popularity',
                    name: 'Popular Choice',
                    description: `Recommended because this course is popular among learners`,
                    importance: this.calculateImportance(popularityData.score, 0.4),
                    confidence: 0.6,
                    details: {
                        popularityScore: popularityData.score,
                        totalEnrollments: popularityData.enrollments,
                        averageRating: popularityData.rating,
                        recentTrend: popularityData.trend
                    }
                };

                explanation.factors.push(factor);
            }

        } catch (error) {
            console.error('Error generating popularity explanation:', error);
        }
    }

    /**
     * Generate diversity explanation
     */
    async generateDiversityExplanation(userId, courseId, explanation) {
        try {
            const userHistory = await this.getUserCourseHistory(userId);
            const courseInfo = await this.getCourseInfo(courseId);
            
            // Check if this course adds diversity to user's learning
            const diversityScore = this.calculateDiversityScore(userHistory, courseInfo);
            
            if (diversityScore > 0.6) {
                const factor = {
                    type: 'diversity',
                    name: 'Expand Your Horizons',
                    description: `Recommended to help you explore new areas and diversify your skills`,
                    importance: this.calculateImportance(diversityScore, 0.3),
                    confidence: 0.5,
                    details: {
                        diversityScore: diversityScore,
                        newCategory: !userHistory.some(course => course.category === courseInfo.category),
                        newDifficulty: !userHistory.some(course => course.difficulty === courseInfo.difficulty),
                        skillGap: diversityScore > 0.8 ? 'high' : 'medium'
                    }
                };

                explanation.factors.push(factor);
            }

        } catch (error) {
            console.error('Error generating diversity explanation:', error);
        }
    }

    /**
     * Find similar users for collaborative filtering
     */
    async findSimilarUsers(userId, courseId) {
        // Simulate finding similar users
        const similarUsers = [];
        const numSimilar = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < numSimilar; i++) {
            similarUsers.push({
                userId: `user_${Math.random().toString(36).substr(2, 9)}`,
                similarity: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
                rating: Math.random() * 2 + 3, // 3 to 5
                completed: Math.random() > 0.3
            });
        }
        
        return similarUsers.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Analyze course content for content-based filtering
     */
    async analyzeCourseContent(userId, courseId) {
        // Simulate content analysis
        const topics = ['JavaScript', 'Python', 'Machine Learning', 'Web Development', 'Data Science'];
        const userInterests = topics.slice(0, Math.floor(Math.random() * 3) + 1);
        
        return {
            matchScore: Math.random() * 0.7 + 0.3,
            matchedTopics: userInterests,
            skillAlignment: Math.random() * 0.5 + 0.5,
            difficultyMatch: Math.random() * 0.4 + 0.6
        };
    }

    /**
     * Get user preferences
     */
    async getUserPreferences(userId) {
        // Simulate user preferences
        return {
            categories: {
                'Programming': 0.8,
                'Data Science': 0.6,
                'Web Development': 0.7
            },
            difficulty: {
                'beginner': 0.4,
                'intermediate': 0.5,
                'advanced': 0.1
            },
            instructors: {
                'John Doe': 0.9,
                'Jane Smith': 0.7
            }
        };
    }

    /**
     * Get course information
     */
    async getCourseInfo(courseId) {
        // Simulate course information
        const categories = ['Programming', 'Data Science', 'Web Development', 'Mobile Development'];
        const difficulties = ['beginner', 'intermediate', 'advanced'];
        
        return {
            courseId,
            title: `Course ${courseId}`,
            category: categories[Math.floor(Math.random() * categories.length)],
            difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
            instructor: `Instructor ${Math.floor(Math.random() * 10) + 1}`,
            rating: Math.random() * 2 + 3,
            duration: Math.floor(Math.random() * 50) + 10
        };
    }

    /**
     * Get course popularity data
     */
    async getCoursePopularity(courseId) {
        // Simulate popularity data
        return {
            score: Math.random() * 0.8 + 0.2,
            enrollments: Math.floor(Math.random() * 10000) + 1000,
            rating: Math.random() * 2 + 3,
            trend: Math.random() > 0.5 ? 'increasing' : 'stable'
        };
    }

    /**
     * Get user course history
     */
    async getUserCourseHistory(userId) {
        // Simulate user course history
        const history = [];
        const numCourses = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < numCourses; i++) {
            const courseInfo = await this.getCourseInfo(`course_${i}`);
            history.push(courseInfo);
        }
        
        return history;
    }

    /**
     * Calculate diversity score
     */
    calculateDiversityScore(userHistory, courseInfo) {
        let diversityScore = 0;
        
        // Category diversity
        const categoryExists = userHistory.some(course => course.category === courseInfo.category);
        if (!categoryExists) {
            diversityScore += 0.4;
        }
        
        // Difficulty diversity
        const difficultyExists = userHistory.some(course => course.difficulty === courseInfo.difficulty);
        if (!difficultyExists) {
            diversityScore += 0.3;
        }
        
        // Instructor diversity
        const instructorExists = userHistory.some(course => course.instructor === courseInfo.instructor);
        if (!instructorExists) {
            diversityScore += 0.3;
        }
        
        return Math.min(diversityScore, 1.0);
    }

    /**
     * Calculate importance score for a factor
     */
    calculateImportance(score, weight) {
        return score * weight;
    }

    /**
     * Calculate overall explanation score
     */
    calculateOverallScore(factors) {
        if (factors.length === 0) return 0;
        
        const totalImportance = factors.reduce((sum, factor) => sum + factor.importance, 0);
        return totalImportance / factors.length;
    }

    /**
     * Calculate confidence score
     */
    calculateConfidence(factors) {
        if (factors.length === 0) return 0;
        
        const totalConfidence = factors.reduce((sum, factor) => sum + factor.confidence, 0);
        return Math.min(totalConfidence / factors.length, 1.0);
    }

    /**
     * Calculate average rating from similar users
     */
    calculateAverageRating(similarUsers) {
        if (similarUsers.length === 0) return 0;
        
        const totalRating = similarUsers.reduce((sum, user) => sum + user.rating, 0);
        return totalRating / similarUsers.length;
    }

    /**
     * Calculate overlap percentage
     */
    calculateOverlap(similarUsers) {
        const completedUsers = similarUsers.filter(user => user.completed).length;
        return similarUsers.length > 0 ? completedUsers / similarUsers.length : 0;
    }

    /**
     * Generate human-readable summary
     */
    generateSummary(explanation) {
        const topFactors = explanation.factors.slice(0, 3);
        const factorNames = topFactors.map(factor => factor.name).join(', ');
        
        return {
            short: `Recommended based on ${factorNames}`,
            detailed: `This course was recommended because ${topFactors.map(f => f.description).join('. ')}.`,
            confidence: `We are ${(explanation.confidence * 100).toFixed(0)}% confident you'll enjoy this course.`,
            keyFactors: topFactors.map(f => ({
                type: f.type,
                name: f.name,
                reason: f.description
            }))
        };
    }

    /**
     * Get explanation for multiple recommendations
     */
    async explainBatchRecommendations(userId, recommendations) {
        try {
            const explanations = [];
            
            for (const recommendation of recommendations) {
                const explanation = await this.explainRecommendation(
                    userId, 
                    recommendation.courseId,
                    recommendation
                );
                explanations.push(explanation);
            }
            
            // Generate comparative analysis
            const comparativeAnalysis = this.generateComparativeAnalysis(explanations);
            
            return {
                userId,
                explanations,
                comparativeAnalysis,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error explaining batch recommendations:', error);
            throw error;
        }
    }

    /**
     * Generate comparative analysis of multiple explanations
     */
    generateComparativeAnalysis(explanations) {
        const analysis = {
            totalRecommendations: explanations.length,
            averageConfidence: 0,
            commonFactors: {},
            diversityScore: 0,
            recommendationTypes: {}
        };

        // Calculate average confidence
        const totalConfidence = explanations.reduce((sum, exp) => sum + exp.confidence, 0);
        analysis.averageConfidence = totalConfidence / explanations.length;

        // Find common factors
        explanations.forEach(explanation => {
            explanation.factors.forEach(factor => {
                if (!analysis.commonFactors[factor.type]) {
                    analysis.commonFactors[factor.type] = {
                        count: 0,
                        totalImportance: 0
                    };
                }
                analysis.commonFactors[factor.type].count++;
                analysis.commonFactors[factor.type].totalImportance += factor.importance;
            });
        });

        // Calculate average importance for common factors
        Object.keys(analysis.commonFactors).forEach(factorType => {
            const factor = analysis.commonFactors[factorType];
            factor.averageImportance = factor.totalImportance / factor.count;
        });

        // Analyze recommendation types
        explanations.forEach(explanation => {
            const algorithm = explanation.transparency.algorithm;
            analysis.recommendationTypes[algorithm] = (analysis.recommendationTypes[algorithm] || 0) + 1;
        });

        return analysis;
    }

    /**
     * Get explanation statistics
     */
    async getExplanationStats(timeRange = '7d') {
        try {
            // Simulate statistics
            return {
                timeRange,
                totalExplanations: Math.floor(Math.random() * 10000) + 1000,
                averageConfidence: Math.random() * 0.3 + 0.7,
                topFactors: [
                    { type: 'collaborative_filtering', count: Math.floor(Math.random() * 3000) + 1000 },
                    { type: 'content_based', count: Math.floor(Math.random() * 2500) + 800 },
                    { type: 'user_preferences', count: Math.floor(Math.random() * 2000) + 600 },
                    { type: 'popularity', count: Math.floor(Math.random() * 1500) + 400 }
                ],
                userSatisfaction: Math.random() * 0.2 + 0.8,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting explanation stats:', error);
            throw error;
        }
    }

    /**
     * Cache management methods
     */
    async getFromCache(key) {
        // Check in-memory cache first
        const memoryCache = this.explanationCache.get(key);
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
                    this.explanationCache.set(key, {
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
        this.explanationCache.set(key, {
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

    /**
     * Clear explanation cache
     */
    async clearCache(userId = null) {
        if (userId) {
            // Clear user-specific cache
            for (const [key] of this.explanationCache.entries()) {
                if (key.includes(`explanation:${userId}:`)) {
                    this.explanationCache.delete(key);
                }
            }

            if (this.redisClient) {
                try {
                    const keys = await this.redisClient.keys(`explanation:${userId}:*`);
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                } catch (error) {
                    console.warn('Redis cache clear error:', error.message);
                }
            }
        } else {
            // Clear all cache
            this.explanationCache.clear();

            if (this.redisClient) {
                try {
                    const keys = await this.redisClient.keys('explanation:*');
                    if (keys.length > 0) {
                        await this.redisClient.del(keys);
                    }
                } catch (error) {
                    console.warn('Redis cache clear error:', error.message);
                }
            }
        }
    }

    /**
     * Export explanation data for analysis
     */
    async exportExplanationData(userId = null, timeRange = '30d') {
        try {
            // This would export explanation data for analysis
            return {
                userId,
                timeRange,
                exportFormat: 'json',
                data: [], // Would contain actual explanation data
                exportedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error exporting explanation data:', error);
            throw error;
        }
    }
}

module.exports = new RecommendationExplainer();
