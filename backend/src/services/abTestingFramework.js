/**
 * A/B Testing Framework for Recommendation Systems
 * Provides experiment management, user assignment, and statistical analysis
 */

const crypto = require('crypto');
const redis = require('redis');
const { promisify } = require('util');

class ABTestingFramework {
    constructor() {
        this.redisClient = null;
        this.experiments = new Map();
        this.userAssignments = new Map();
        
        // Configuration
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            redisDb: 4, // Separate DB for A/B testing
            assignmentTTL: 60 * 60 * 24 * 30, // 30 days
            experimentTTL: 60 * 60 * 24 * 90, // 90 days
            significanceLevel: 0.05,
            minSampleSize: 100
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
                console.error('A/B Testing Redis connection error:', err);
            });
            
            await this.redisClient.connect();
            console.log('A/B Testing Framework: Redis connected');
        } catch (error) {
            console.warn('A/B Testing: Redis not available, using in-memory storage:', error.message);
            this.redisClient = null;
        }
    }

    /**
     * Create a new A/B test experiment
     */
    async createExperiment(experimentConfig) {
        const {
            name,
            description,
            variants,
            trafficAllocation,
            startDate,
            endDate,
            targetCriteria = {},
            successMetrics = ['conversion_rate', 'engagement_time']
        } = experimentConfig;

        try {
            // Validate experiment configuration
            if (!name || !variants || variants.length < 2) {
                throw new Error('Experiment name and at least 2 variants are required');
            }

            // Validate traffic allocation
            const totalAllocation = trafficAllocation ? 
                trafficAllocation.reduce((sum, alloc) => sum + alloc, 0) : 
                variants.length;
            
            if (Math.abs(totalAllocation - 100) > 0.01) {
                throw new Error('Traffic allocation must sum to 100%');
            }

            const experiment = {
                id: crypto.randomUUID(),
                name,
                description,
                variants: variants.map((variant, index) => ({
                    id: variant.id || `variant_${index}`,
                    name: variant.name,
                    description: variant.description,
                    config: variant.config || {},
                    trafficWeight: trafficAllocation ? trafficAllocation[index] : 100 / variants.length
                })),
                status: 'draft',
                startDate: startDate || new Date().toISOString(),
                endDate: endDate,
                targetCriteria,
                successMetrics,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                stats: {
                    totalUsers: 0,
                    variantStats: variants.map((variant, index) => ({
                        variantId: variant.id || `variant_${index}`,
                        users: 0,
                        conversions: 0,
                        conversionRate: 0,
                        engagementTime: 0,
                        avgEngagementTime: 0,
                        revenue: 0,
                        avgRevenue: 0
                    }))
                }
            };

            // Store experiment
            if (this.redisClient) {
                await this.redisClient.setEx(
                    `experiment:${name}`,
                    this.config.experimentTTL,
                    JSON.stringify(experiment)
                );
            } else {
                this.experiments.set(name, experiment);
            }

            console.log(`A/B Test experiment created: ${name}`);
            return experiment;

        } catch (error) {
            console.error('Error creating experiment:', error);
            throw error;
        }
    }

    /**
     * Assign user to experiment variant
     */
    async assignUserToTest(userId, testName, variants = null) {
        try {
            // Check if user is already assigned
            const existingAssignment = await this.getUserAssignment(userId, testName);
            if (existingAssignment) {
                return existingAssignment;
            }

            // Get experiment configuration
            let experiment;
            if (this.redisClient) {
                const experimentData = await this.redisClient.get(`experiment:${testName}`);
                experiment = JSON.parse(experimentData);
            } else {
                experiment = this.experiments.get(testName);
            }

            if (!experiment) {
                throw new Error(`Experiment not found: ${testName}`);
            }

            // Check if experiment is active
            if (experiment.status !== 'active') {
                throw new Error(`Experiment ${testName} is not active`);
            }

            // Check if experiment is within date range
            const now = new Date();
            if (experiment.startDate && new Date(experiment.startDate) > now) {
                throw new Error(`Experiment ${testName} has not started yet`);
            }
            if (experiment.endDate && new Date(experiment.endDate) < now) {
                throw new Error(`Experiment ${testName} has ended`);
            }

            // Check if user meets target criteria
            if (experiment.targetCriteria && Object.keys(experiment.targetCriteria).length > 0) {
                const meetsCriteria = await this.checkUserCriteria(userId, experiment.targetCriteria);
                if (!meetsCriteria) {
                    return { assigned: false, reason: 'User does not meet target criteria' };
                }
            }

            // Use provided variants or experiment variants
            const targetVariants = variants || experiment.variants;

            // Assign variant based on traffic allocation
            const variant = this.assignVariant(userId, targetVariants);

            const assignment = {
                userId,
                testName,
                variantId: variant.id,
                variantName: variant.name,
                assignedAt: new Date().toISOString(),
                experimentId: experiment.id
            };

            // Store assignment
            if (this.redisClient) {
                await this.redisClient.setEx(
                    `assignment:${userId}:${testName}`,
                    this.config.assignmentTTL,
                    JSON.stringify(assignment)
                );

                // Update experiment stats
                await this.updateExperimentStats(testName, variant.id, 'user_assigned');
            } else {
                const key = `${userId}:${testName}`;
                this.userAssignments.set(key, assignment);
            }

            console.log(`User ${userId} assigned to variant ${variant.name} in experiment ${testName}`);
            return assignment;

        } catch (error) {
            console.error('Error assigning user to test:', error);
            throw error;
        }
    }

    /**
     * Assign variant based on traffic allocation
     */
    assignVariant(userId, variants) {
        // Use consistent hashing for user assignment
        const hash = this.hashUserId(userId);
        const randomValue = hash / 0xFFFFFFFF; // Normalize to 0-1
        
        let cumulativeWeight = 0;
        for (const variant of variants) {
            cumulativeWeight += variant.trafficWeight / 100;
            if (randomValue <= cumulativeWeight) {
                return variant;
            }
        }
        
        // Fallback to last variant
        return variants[variants.length - 1];
    }

    /**
     * Hash user ID for consistent assignment
     */
    hashUserId(userId) {
        const hash = crypto.createHash('md5');
        hash.update(userId.toString());
        const hashHex = hash.digest('hex');
        return parseInt(hashHex.substring(0, 8), 16);
    }

    /**
     * Track event for A/B test
     */
    async trackEvent(userId, testName, event, value = null) {
        try {
            // Get user assignment
            const assignment = await this.getUserAssignment(userId, testName);
            if (!assignment) {
                throw new Error(`User ${userId} not assigned to experiment ${testName}`);
            }

            const eventData = {
                userId,
                testName,
                variantId: assignment.variantId,
                event,
                value,
                timestamp: new Date().toISOString()
            };

            // Store event
            if (this.redisClient) {
                await this.redisClient.lPush(
                    `events:${testName}:${assignment.variantId}`,
                    JSON.stringify(eventData)
                );

                // Update experiment stats
                await this.updateExperimentStats(testName, assignment.variantId, event, value);
            } else {
                // In-memory event storage (simplified)
                const key = `events:${testName}:${assignment.variantId}`;
                if (!this.events) this.events = new Map();
                if (!this.events.has(key)) this.events.set(key, []);
                this.events.get(key).push(eventData);
            }

            console.log(`Event tracked: ${event} for user ${userId} in ${testName}`);

        } catch (error) {
            console.error('Error tracking event:', error);
            throw error;
        }
    }

    /**
     * Get experiment results and statistical analysis
     */
    async getTestResults(testName) {
        try {
            // Get experiment configuration
            let experiment;
            if (this.redisClient) {
                const experimentData = await this.redisClient.get(`experiment:${testName}`);
                experiment = JSON.parse(experimentData);
            } else {
                experiment = this.experiments.get(testName);
            }

            if (!experiment) {
                throw new Error(`Experiment not found: ${testName}`);
            }

            // Get current stats
            const stats = await this.getExperimentStats(testName);

            // Calculate statistical significance
            const analysis = this.calculateStatisticalSignificance(stats, experiment.successMetrics);

            return {
                experiment: {
                    id: experiment.id,
                    name: experiment.name,
                    description: experiment.description,
                    variants: experiment.variants,
                    status: experiment.status,
                    startDate: experiment.startDate,
                    endDate: experiment.endDate
                },
                stats,
                analysis,
                generatedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error getting test results:', error);
            throw error;
        }
    }

    /**
     * Calculate statistical significance for experiment results
     */
    calculateStatisticalSignificance(stats, successMetrics) {
        const analysis = {
            significant: false,
            confidenceLevel: (1 - this.config.significanceLevel) * 100,
            winner: null,
            tests: {}
        };

        const variants = Object.keys(stats.variantStats);
        if (variants.length < 2) {
            return analysis;
        }

        // Compare each variant against control (first variant)
        const controlVariant = variants[0];
        const controlStats = stats.variantStats[controlVariant];

        for (let i = 1; i < variants.length; i++) {
            const variant = variants[i];
            const variantStats = stats.variantStats[variant];

            const testResults = {};

            // Conversion rate test
            if (controlStats.users > 0 && variantStats.users > 0) {
                const controlRate = controlStats.conversions / controlStats.users;
                const variantRate = variantStats.conversions / variantStats.users;
                
                testResults.conversionRate = {
                    control: controlRate,
                    variant: variantRate,
                    lift: ((variantRate - controlRate) / controlRate) * 100,
                    pValue: this.calculatePValue(
                        controlStats.conversions, controlStats.users,
                        variantStats.conversions, variantStats.users
                    ),
                    significant: false
                };

                testResults.conversionRate.significant = 
                    testResults.conversionRate.pValue < this.config.significanceLevel;
            }

            // Engagement time test
            if (controlStats.avgEngagementTime > 0 && variantStats.avgEngagementTime > 0) {
                testResults.engagementTime = {
                    control: controlStats.avgEngagementTime,
                    variant: variantStats.avgEngagementTime,
                    lift: ((variantStats.avgEngagementTime - controlStats.avgEngagementTime) / controlStats.avgEngagementTime) * 100,
                    pValue: this.calculateTwoSampleTTest(
                        controlStats.avgEngagementTime, controlStats.users,
                        variantStats.avgEngagementTime, variantStats.users
                    ),
                    significant: false
                };

                testResults.engagementTime.significant = 
                    testResults.engagementTime.pValue < this.config.significanceLevel;
            }

            analysis.tests[variant] = testResults;
        }

        // Determine winner
        let bestVariant = null;
        let bestScore = -Infinity;

        for (const variant of variants) {
            const variantStats = stats.variantStats[variant];
            let score = 0;

            // Calculate composite score
            if (successMetrics.includes('conversion_rate') && variantStats.users > 0) {
                score += (variantStats.conversions / variantStats.users) * 0.5;
            }
            if (successMetrics.includes('engagement_time') && variantStats.avgEngagementTime > 0) {
                score += Math.log(variantStats.avgEngagementTime) * 0.3;
            }
            if (successMetrics.includes('revenue') && variantStats.avgRevenue > 0) {
                score += variantStats.avgRevenue * 0.2;
            }

            if (score > bestScore) {
                bestScore = score;
                bestVariant = variant;
            }
        }

        analysis.winner = bestVariant;
        analysis.significant = Object.values(analysis.tests).some(test => 
            Object.values(test).some(result => result && result.significant)
        );

        return analysis;
    }

    /**
     * Calculate p-value for conversion rate comparison (z-test)
     */
    calculatePValue(controlConversions, controlUsers, variantConversions, variantUsers) {
        const controlRate = controlConversions / controlUsers;
        const variantRate = variantConversions / variantUsers;
        
        const pooledRate = (controlConversions + variantConversions) / (controlUsers + variantUsers);
        const standardError = Math.sqrt(
            pooledRate * (1 - pooledRate) * (1/controlUsers + 1/variantUsers)
        );
        
        if (standardError === 0) return 1;
        
        const zScore = (variantRate - controlRate) / standardError;
        
        // Approximate p-value for two-tailed test
        const absZ = Math.abs(zScore);
        return 2 * (1 - this.normalCDF(absZ));
    }

    /**
     * Calculate p-value for two-sample t-test
     */
    calculateTwoSampleTTest(mean1, n1, mean2, n2) {
        // Simplified t-test calculation
        const pooledStdError = Math.sqrt((1/n1) + (1/n2));
        const tScore = (mean2 - mean1) / pooledStdError;
        
        // Approximate p-value (simplified)
        const absT = Math.abs(tScore);
        return 2 * (1 - this.normalCDF(absT));
    }

    /**
     * Normal cumulative distribution function (approximation)
     */
    normalCDF(x) {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;
        
        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x) / Math.sqrt(2);
        
        const t = 1 / (1 + p * x);
        const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return 0.5 * (1 + sign * y);
    }

    /**
     * Get user assignment
     */
    async getUserAssignment(userId, testName) {
        try {
            if (this.redisClient) {
                const assignmentData = await this.redisClient.get(`assignment:${userId}:${testName}`);
                return assignmentData ? JSON.parse(assignmentData) : null;
            } else {
                const key = `${userId}:${testName}`;
                return this.userAssignments.get(key) || null;
            }
        } catch (error) {
            console.error('Error getting user assignment:', error);
            return null;
        }
    }

    /**
     * Update experiment statistics
     */
    async updateExperimentStats(testName, variantId, event, value = null) {
        try {
            if (!this.redisClient) return;

            const statsKey = `stats:${testName}:${variantId}`;
            
            switch (event) {
                case 'user_assigned':
                    await this.redisClient.hIncrBy(statsKey, 'users', 1);
                    break;
                case 'conversion':
                    await this.redisClient.hIncrBy(statsKey, 'conversions', 1);
                    break;
                case 'engagement_time':
                    await this.redisClient.hIncrByFloat(statsKey, 'engagementTime', value || 0);
                    break;
                case 'revenue':
                    await this.redisClient.hIncrByFloat(statsKey, 'revenue', value || 0);
                    break;
            }

        } catch (error) {
            console.error('Error updating experiment stats:', error);
        }
    }

    /**
     * Get experiment statistics
     */
    async getExperimentStats(testName) {
        try {
            let experiment;
            if (this.redisClient) {
                const experimentData = await this.redisClient.get(`experiment:${testName}`);
                experiment = JSON.parse(experimentData);
            } else {
                experiment = this.experiments.get(testName);
            }

            if (!experiment) {
                throw new Error(`Experiment not found: ${testName}`);
            }

            const stats = {
                totalUsers: 0,
                variantStats: {}
            };

            // Get stats for each variant
            for (const variant of experiment.variants) {
                let variantStats;
                
                if (this.redisClient) {
                    const statsKey = `stats:${testName}:${variant.id}`;
                    const rawStats = await this.redisClient.hGetAll(statsKey);
                    
                    variantStats = {
                        users: parseInt(rawStats.users || 0),
                        conversions: parseInt(rawStats.conversions || 0),
                        engagementTime: parseFloat(rawStats.engagementTime || 0),
                        revenue: parseFloat(rawStats.revenue || 0)
                    };
                } else {
                    variantStats = {
                        users: 0,
                        conversions: 0,
                        engagementTime: 0,
                        revenue: 0
                    };
                }

                // Calculate derived metrics
                variantStats.conversionRate = variantStats.users > 0 ? 
                    variantStats.conversions / variantStats.users : 0;
                variantStats.avgEngagementTime = variantStats.conversions > 0 ? 
                    variantStats.engagementTime / variantStats.conversions : 0;
                variantStats.avgRevenue = variantStats.conversions > 0 ? 
                    variantStats.revenue / variantStats.conversions : 0;

                stats.variantStats[variant.id] = variantStats;
                stats.totalUsers += variantStats.users;
            }

            return stats;

        } catch (error) {
            console.error('Error getting experiment stats:', error);
            throw error;
        }
    }

    /**
     * Check if user meets target criteria
     */
    async checkUserCriteria(userId, criteria) {
        // In a real implementation, this would check user properties
        // For now, return true (all users are eligible)
        return true;
    }

    /**
     * Start an experiment
     */
    async startExperiment(testName) {
        try {
            let experiment;
            if (this.redisClient) {
                const experimentData = await this.redisClient.get(`experiment:${testName}`);
                experiment = JSON.parse(experimentData);
            } else {
                experiment = this.experiments.get(testName);
            }

            if (!experiment) {
                throw new Error(`Experiment not found: ${testName}`);
            }

            experiment.status = 'active';
            experiment.updatedAt = new Date().toISOString();

            if (this.redisClient) {
                await this.redisClient.setEx(
                    `experiment:${testName}`,
                    this.config.experimentTTL,
                    JSON.stringify(experiment)
                );
            } else {
                this.experiments.set(testName, experiment);
            }

            console.log(`Experiment started: ${testName}`);
            return experiment;

        } catch (error) {
            console.error('Error starting experiment:', error);
            throw error;
        }
    }

    /**
     * Stop an experiment
     */
    async stopExperiment(testName) {
        try {
            let experiment;
            if (this.redisClient) {
                const experimentData = await this.redisClient.get(`experiment:${testName}`);
                experiment = JSON.parse(experimentData);
            } else {
                experiment = this.experiments.get(testName);
            }

            if (!experiment) {
                throw new Error(`Experiment not found: ${testName}`);
            }

            experiment.status = 'completed';
            experiment.updatedAt = new Date().toISOString();

            if (this.redisClient) {
                await this.redisClient.setEx(
                    `experiment:${testName}`,
                    this.config.experimentTTL,
                    JSON.stringify(experiment)
                );
            } else {
                this.experiments.set(testName, experiment);
            }

            console.log(`Experiment stopped: ${testName}`);
            return experiment;

        } catch (error) {
            console.error('Error stopping experiment:', error);
            throw error;
        }
    }

    /**
     * List all experiments
     */
    async listExperiments() {
        try {
            const experiments = [];

            if (this.redisClient) {
                const keys = await this.redisClient.keys('experiment:*');
                for (const key of keys) {
                    const experimentData = await this.redisClient.get(key);
                    experiments.push(JSON.parse(experimentData));
                }
            } else {
                for (const [name, experiment] of this.experiments.entries()) {
                    experiments.push(experiment);
                }
            }

            return experiments.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );

        } catch (error) {
            console.error('Error listing experiments:', error);
            return [];
        }
    }

    /**
     * Delete experiment
     */
    async deleteExperiment(testName) {
        try {
            if (this.redisClient) {
                await this.redisClient.del(`experiment:${testName}`);
                
                // Clean up related data
                const keys = await this.redisClient.keys(`*:${testName}:*`);
                if (keys.length > 0) {
                    await this.redisClient.del(keys);
                }
            } else {
                this.experiments.delete(testName);
            }

            console.log(`Experiment deleted: ${testName}`);
            return true;

        } catch (error) {
            console.error('Error deleting experiment:', error);
            throw error;
        }
    }
}

module.exports = new ABTestingFramework();
