/**
 * User Behavior Tracking and Analysis Service
 * Tracks user interactions, analyzes patterns, and provides insights
 */

const crypto = require('crypto');
const redis = require('redis');
const { promisify } = require('util');
const EventEmitter = require('events');

class UserBehaviorTracker extends EventEmitter {
    constructor() {
        super();
        this.redisClient = null;
        this.behaviorPatterns = new Map();
        this.userProfiles = new Map();
        
        // Configuration
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            redisDb: 5, // Separate DB for behavior tracking
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            patternUpdateInterval: 60 * 60 * 1000, // 1 hour
            maxEventsPerSession: 1000,
            aggregationWindow: 24 * 60 * 60 * 1000 // 24 hours
        };
        
        this.initializeRedis();
        this.startPatternAnalysis();
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
                console.error('Behavior Tracking Redis connection error:', err);
            });
            
            await this.redisClient.connect();
            console.log('User Behavior Tracker: Redis connected');
        } catch (error) {
            console.warn('User Behavior Tracker: Redis not available, using in-memory storage:', error.message);
            this.redisClient = null;
        }
    }

    /**
     * Track user interaction
     */
    async trackInteraction(interactionData) {
        try {
            const {
                userId,
                courseId,
                interactionType,
                rating = null,
                duration = null,
                metadata = {},
                sessionId = this.generateSessionId(userId),
                timestamp = new Date().toISOString()
            } = interactionData;

            // Validate required fields
            if (!userId || !courseId || !interactionType) {
                throw new Error('userId, courseId, and interactionType are required');
            }

            // Create interaction event
            const event = {
                id: crypto.randomUUID(),
                userId,
                courseId,
                interactionType,
                rating,
                duration,
                metadata,
                sessionId,
                timestamp,
                userAgent: metadata.userAgent || null,
                ipAddress: metadata.ipAddress || null,
                referrer: metadata.referrer || null
            };

            // Store event
            await this.storeEvent(event);

            // Update user session
            await this.updateUserSession(userId, sessionId, event);

            // Update real-time metrics
            await this.updateRealTimeMetrics(event);

            // Emit event for real-time processing
            this.emit('interaction', event);

            // Check for behavior patterns
            await this.analyzeRealTimePatterns(userId, event);

            console.log(`Interaction tracked: ${interactionType} for user ${userId}, course ${courseId}`);
            return event;

        } catch (error) {
            console.error('Error tracking interaction:', error);
            throw error;
        }
    }

    /**
     * Track recommendation request
     */
    async trackRecommendationRequest(userId, requestData) {
        try {
            const event = {
                id: crypto.randomUUID(),
                userId,
                type: 'recommendation_request',
                timestamp: new Date().toISOString(),
                data: requestData
            };

            await this.storeEvent(event);
            this.emit('recommendation_request', event);

            return event;

        } catch (error) {
            console.error('Error tracking recommendation request:', error);
            throw error;
        }
    }

    /**
     * Track profile update
     */
    async trackProfileUpdate(userId, updateData) {
        try {
            const event = {
                id: crypto.randomUUID(),
                userId,
                type: 'profile_update',
                timestamp: new Date().toISOString(),
                data: updateData
            };

            await this.storeEvent(event);
            this.emit('profile_update', event);

            return event;

        } catch (error) {
            console.error('Error tracking profile update:', error);
            throw error;
        }
    }

    /**
     * Store event in database
     */
    async storeEvent(event) {
        try {
            if (this.redisClient) {
                // Store in Redis with TTL
                const eventKey = `event:${event.id}`;
                await this.redisClient.setEx(
                    eventKey,
                    7 * 24 * 60 * 60, // 7 days TTL
                    JSON.stringify(event)
                );

                // Add to user's event stream
                const userEventsKey = `user_events:${event.userId}`;
                await this.redisClient.lPush(userEventsKey, JSON.stringify(event));
                await this.redisClient.lTrim(userEventsKey, 0, 999); // Keep last 1000 events

                // Add to time-based stream for analytics
                const timeKey = `events:${new Date().toISOString().split('T')[0]}`;
                await this.redisClient.lPush(timeKey, JSON.stringify(event));
                await this.redisClient.expire(timeKey, 30 * 24 * 60 * 60); // 30 days TTL

            } else {
                // In-memory storage (simplified)
                if (!this.events) this.events = [];
                this.events.push(event);
            }

        } catch (error) {
            console.error('Error storing event:', error);
        }
    }

    /**
     * Update user session
     */
    async updateUserSession(userId, sessionId, event) {
        try {
            const sessionKey = `session:${sessionId}`;
            const sessionData = {
                userId,
                sessionId,
                startTime: new Date().toISOString(),
                lastActivity: event.timestamp,
                events: [event.id],
                interactions: {
                    views: 0,
                    clicks: 0,
                    enrollments: 0,
                    completions: 0,
                    ratings: 0
                },
                coursesViewed: new Set([event.courseId]),
                totalTime: 0
            };

            // Update interaction counts
            switch (event.interactionType) {
                case 'view':
                    sessionData.interactions.views++;
                    break;
                case 'click':
                    sessionData.interactions.clicks++;
                    break;
                case 'enroll':
                    sessionData.interactions.enrollments++;
                    break;
                case 'complete':
                    sessionData.interactions.completions++;
                    break;
                case 'rate':
                    sessionData.interactions.ratings++;
                    break;
            }

            if (this.redisClient) {
                // Check if session exists
                const existingSession = await this.redisClient.get(sessionKey);
                
                if (existingSession) {
                    const existing = JSON.parse(existingSession);
                    existing.lastActivity = event.timestamp;
                    existing.events.push(event.id);
                    existing.coursesViewed.add(event.courseId);
                    
                    // Update interaction counts
                    switch (event.interactionType) {
                        case 'view':
                            existing.interactions.views++;
                            break;
                        case 'click':
                            existing.interactions.clicks++;
                            break;
                        case 'enroll':
                            existing.interactions.enrollments++;
                            break;
                        case 'complete':
                            existing.interactions.completions++;
                            break;
                        case 'rate':
                            existing.interactions.ratings++;
                            break;
                    }

                    if (event.duration) {
                        existing.totalTime += event.duration;
                    }

                    await this.redisClient.setEx(
                        sessionKey,
                        this.config.sessionTimeout / 1000,
                        JSON.stringify({
                            ...existing,
                            coursesViewed: Array.from(existing.coursesViewed)
                        })
                    );
                } else {
                    await this.redisClient.setEx(
                        sessionKey,
                        this.config.sessionTimeout / 1000,
                        JSON.stringify({
                            ...sessionData,
                            coursesViewed: Array.from(sessionData.coursesViewed)
                        })
                    );
                }
            }

        } catch (error) {
            console.error('Error updating user session:', error);
        }
    }

    /**
     * Update real-time metrics
     */
    async updateRealTimeMetrics(event) {
        try {
            if (!this.redisClient) return;

            const date = new Date().toISOString().split('T')[0];
            const hour = new Date().getHours();

            // Update daily metrics
            const dailyKey = `metrics:daily:${date}`;
            await this.redisClient.hIncrBy(dailyKey, `interactions_${event.interactionType}`, 1);
            await this.redisClient.hIncrBy(dailyKey, 'total_interactions', 1);
            await this.redisClient.hIncrBy(dailyKey, 'active_users', 1);
            await this.redisClient.expire(dailyKey, 7 * 24 * 60 * 60);

            // Update hourly metrics
            const hourlyKey = `metrics:hourly:${date}:${hour}`;
            await this.redisClient.hIncrBy(hourlyKey, `interactions_${event.interactionType}`, 1);
            await this.redisClient.hIncrBy(hourlyKey, 'total_interactions', 1);
            await this.redisClient.expire(hourlyKey, 2 * 24 * 60 * 60);

        } catch (error) {
            console.error('Error updating real-time metrics:', error);
        }
    }

    /**
     * Analyze real-time patterns
     */
    async analyzeRealTimePatterns(userId, event) {
        try {
            // Get recent user events
            const recentEvents = await this.getUserRecentEvents(userId, 10);
            
            // Detect patterns
            const patterns = this.detectPatterns(recentEvents);
            
            if (patterns.length > 0) {
                this.emit('pattern_detected', {
                    userId,
                    patterns,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Error analyzing real-time patterns:', error);
        }
    }

    /**
     * Detect behavior patterns
     */
    detectPatterns(events) {
        const patterns = [];

        if (events.length < 3) return patterns;

        // Pattern 1: Rapid course switching
        const recentEvents = events.slice(-5);
        const courseSwitches = recentEvents.filter(e => e.interactionType === 'view');
        
        if (courseSwitches.length >= 3) {
            const timeSpan = new Date(recentEvents[recentEvents.length - 1].timestamp) - 
                           new Date(recentEvents[0].timestamp);
            
            if (timeSpan < 5 * 60 * 1000) { // 5 minutes
                patterns.push({
                    type: 'rapid_course_switching',
                    severity: 'medium',
                    description: 'User is rapidly switching between courses',
                    events: courseSwitches.length,
                    timeSpan: timeSpan
                });
            }
        }

        // Pattern 2: High engagement session
        const totalDuration = events.reduce((sum, e) => sum + (e.duration || 0), 0);
        if (totalDuration > 60 * 60 * 1000) { // 1 hour
            patterns.push({
                type: 'high_engagement',
                severity: 'positive',
                description: 'User showing high engagement',
                totalDuration: totalDuration
            });
        }

        // Pattern 3: Binge watching
        const completions = events.filter(e => e.interactionType === 'complete');
        if (completions.length >= 2) {
            patterns.push({
                type: 'binge_watching',
                severity: 'positive',
                description: 'User completed multiple courses',
                completions: completions.length
            });
        }

        return patterns;
    }

    /**
     * Get user behavior analytics
     */
    async getUserAnalytics(userId, timeRange = '7d') {
        try {
            const endDate = new Date();
            const startDate = new Date();
            
            switch (timeRange) {
                case '1d':
                    startDate.setDate(endDate.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
                case '90d':
                    startDate.setDate(endDate.getDate() - 90);
                    break;
            }

            const events = await this.getUserEventsInTimeRange(userId, startDate, endDate);
            
            const analytics = {
                userId,
                timeRange,
                totalEvents: events.length,
                interactionTypes: {},
                coursesViewed: new Set(),
                coursesEnrolled: new Set(),
                coursesCompleted: new Set(),
                totalWatchTime: 0,
                averageSessionTime: 0,
                peakActivityHours: [],
                behaviorScore: 0,
                patterns: []
            };

            // Analyze events
            events.forEach(event => {
                // Count interaction types
                if (!analytics.interactionTypes[event.interactionType]) {
                    analytics.interactionTypes[event.interactionType] = 0;
                }
                analytics.interactionTypes[event.interactionType]++;

                // Track courses
                if (event.interactionType === 'view') {
                    analytics.coursesViewed.add(event.courseId);
                } else if (event.interactionType === 'enroll') {
                    analytics.coursesEnrolled.add(event.courseId);
                } else if (event.interactionType === 'complete') {
                    analytics.coursesCompleted.add(event.courseId);
                }

                // Sum watch time
                if (event.duration) {
                    analytics.totalWatchTime += event.duration;
                }
            });

            // Convert Sets to counts
            analytics.coursesViewed = analytics.coursesViewed.size;
            analytics.coursesEnrolled = analytics.coursesEnrolled.size;
            analytics.coursesCompleted = analytics.coursesCompleted.size;

            // Calculate average session time
            const sessions = await this.getUserSessions(userId);
            if (sessions.length > 0) {
                analytics.averageSessionTime = sessions.reduce((sum, s) => sum + s.totalTime, 0) / sessions.length;
            }

            // Calculate peak activity hours
            analytics.peakActivityHours = this.calculatePeakActivityHours(events);

            // Calculate behavior score
            analytics.behaviorScore = this.calculateBehaviorScore(analytics);

            // Detect patterns
            analytics.patterns = this.detectPatterns(events);

            return analytics;

        } catch (error) {
            console.error('Error getting user analytics:', error);
            throw error;
        }
    }

    /**
     * Get user events in time range
     */
    async getUserEventsInTimeRange(userId, startDate, endDate) {
        try {
            if (this.redisClient) {
                const userEventsKey = `user_events:${userId}`;
                const eventStrings = await this.redisClient.lRange(userEventsKey, 0, -1);
                
                const events = eventStrings.map(str => JSON.parse(str));
                
                return events.filter(event => {
                    const eventTime = new Date(event.timestamp);
                    return eventTime >= startDate && eventTime <= endDate;
                });
            } else {
                // In-memory fallback
                if (!this.events) return [];
                return this.events.filter(event => 
                    event.userId === userId &&
                    new Date(event.timestamp) >= startDate &&
                    new Date(event.timestamp) <= endDate
                );
            }

        } catch (error) {
            console.error('Error getting user events in time range:', error);
            return [];
        }
    }

    /**
     * Get user recent events
     */
    async getUserRecentEvents(userId, limit = 10) {
        try {
            if (this.redisClient) {
                const userEventsKey = `user_events:${userId}`;
                const eventStrings = await this.redisClient.lRange(userEventsKey, 0, limit - 1);
                
                return eventStrings.map(str => JSON.parse(str));
            } else {
                if (!this.events) return [];
                return this.events
                    .filter(event => event.userId === userId)
                    .slice(-limit);
            }

        } catch (error) {
            console.error('Error getting user recent events:', error);
            return [];
        }
    }

    /**
     * Get user sessions
     */
    async getUserSessions(userId) {
        try {
            if (!this.redisClient) return [];

            const pattern = `session:*`;
            const keys = await this.redisClient.keys(pattern);
            
            const sessions = [];
            for (const key of keys) {
                const sessionData = await this.redisClient.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.userId === userId) {
                        sessions.push(session);
                    }
                }
            }

            return sessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        } catch (error) {
            console.error('Error getting user sessions:', error);
            return [];
        }
    }

    /**
     * Calculate peak activity hours
     */
    calculatePeakActivityHours(events) {
        const hourCounts = {};
        
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        // Sort by count and get top 3 hours
        const sortedHours = Object.entries(hourCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([hour, count]) => ({ hour, count }));

        return sortedHours;
    }

    /**
     * Calculate behavior score
     */
    calculateBehaviorScore(analytics) {
        let score = 0;

        // Engagement score (0-40 points)
        const engagementScore = Math.min(40, analytics.totalEvents / 10);
        score += engagementScore;

        // Completion score (0-30 points)
        const completionRate = analytics.coursesEnrolled > 0 ? 
            analytics.coursesCompleted / analytics.coursesEnrolled : 0;
        score += completionRate * 30;

        // Time spent score (0-20 points)
        const timeScore = Math.min(20, analytics.totalWatchTime / (60 * 60 * 1000)); // hours
        score += timeScore;

        // Consistency score (0-10 points)
        const consistencyScore = analytics.peakActivityHours.length > 0 ? 10 : 5;
        score += consistencyScore;

        return Math.round(score);
    }

    /**
     * Get recommendation history
     */
    async getRecommendationHistory(userId, options = {}) {
        const { limit = 50, offset = 0 } = options;

        try {
            if (this.redisClient) {
                const historyKey = `recommendation_history:${userId}`;
                const historyStrings = await this.redisClient.lRange(historyKey, offset, offset + limit - 1);
                
                return historyStrings.map(str => JSON.parse(str));
            } else {
                // In-memory fallback
                if (!this.recommendationHistory) this.recommendationHistory = [];
                return this.recommendationHistory
                    .filter(item => item.userId === userId)
                    .slice(offset, offset + limit);
            }

        } catch (error) {
            console.error('Error getting recommendation history:', error);
            return [];
        }
    }

    /**
     * Get system-wide analytics
     */
    async getSystemAnalytics(timeRange = '24h') {
        try {
            const endDate = new Date();
            const startDate = new Date();
            
            switch (timeRange) {
                case '1h':
                    startDate.setHours(endDate.getHours() - 1);
                    break;
                case '24h':
                    startDate.setDate(endDate.getDate() - 1);
                    break;
                case '7d':
                    startDate.setDate(endDate.getDate() - 7);
                    break;
                case '30d':
                    startDate.setDate(endDate.getDate() - 30);
                    break;
            }

            const analytics = {
                timeRange,
                totalInteractions: 0,
                uniqueUsers: new Set(),
                interactionBreakdown: {},
                topCourses: {},
                peakHours: [],
                averageSessionDuration: 0
            };

            if (this.redisClient) {
                // Get metrics from Redis
                const date = startDate.toISOString().split('T')[0];
                const metricsKey = `metrics:daily:${date}`;
                const metrics = await this.redisClient.hGetAll(metricsKey);
                
                analytics.totalInteractions = parseInt(metrics.total_interactions || 0);
                analytics.uniqueUsers = parseInt(metrics.active_users || 0);
                
                // Get interaction breakdown
                Object.keys(metrics).forEach(key => {
                    if (key.startsWith('interactions_')) {
                        const interactionType = key.replace('interactions_', '');
                        analytics.interactionBreakdown[interactionType] = parseInt(metrics[key]);
                    }
                });
            }

            return analytics;

        } catch (error) {
            console.error('Error getting system analytics:', error);
            throw error;
        }
    }

    /**
     * Start pattern analysis
     */
    startPatternAnalysis() {
        setInterval(async () => {
            try {
                await this.updateBehaviorPatterns();
            } catch (error) {
                console.error('Error in pattern analysis:', error);
            }
        }, this.config.patternUpdateInterval);
    }

    /**
     * Update behavior patterns
     */
    async updateBehaviorPatterns() {
        try {
            console.log('Updating behavior patterns...');
            
            // This would contain sophisticated pattern analysis
            // For now, it's a placeholder
            
            this.emit('patterns_updated', {
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error updating behavior patterns:', error);
        }
    }

    /**
     * Generate session ID
     */
    generateSessionId(userId) {
        const today = new Date().toISOString().split('T')[0];
        return crypto.createHash('md5')
            .update(`${userId}:${today}`)
            .digest('hex');
    }

    /**
     * Clean up old data
     */
    async cleanup() {
        try {
            if (!this.redisClient) return;

            // Clean up old sessions
            const sessionKeys = await this.redisClient.keys('session:*');
            for (const key of sessionKeys) {
                const sessionData = await this.redisClient.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    const lastActivity = new Date(session.lastActivity);
                    const now = new Date();
                    
                    if (now - lastActivity > this.config.sessionTimeout) {
                        await this.redisClient.del(key);
                    }
                }
            }

            console.log('Behavior tracker cleanup completed');

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

module.exports = new UserBehaviorTracker();
