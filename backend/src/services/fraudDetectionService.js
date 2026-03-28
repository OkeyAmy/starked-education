/**
 * Advanced Fraud Detection and Prevention Service
 * Implements sophisticated ML-based fraud detection for educational platform
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const { 
    IsolationForest, 
    LocalOutlierFactor, 
    OneClassSVM 
} = require('scikit-learn');
const { 
    JaroWinklerDistance, 
    CosineSimilarity 
} = require('natural');
const { 
    Graph, 
    algos 
} = require('graphology');
const redis = require('redis');
const kafka = require('kafkajs');

class FraudDetectionService extends EventEmitter {
    constructor() {
        super();
        
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            kafkaBrokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
            anomalyThreshold: 0.7,
            plagiarismThreshold: 0.85,
            behaviorAnalysisWindow: 24 * 60 * 60 * 1000, // 24 hours
            networkAnalysisDepth: 3,
            realTimeProcessing: true,
            autoInvestigation: true
        };
        
        // Initialize connections
        this.redisClient = null;
        this.kafkaProducer = null;
        this.kafkaConsumer = null;
        
        // ML models
        this.behavioralModel = null;
        this.plagiarismModel = null;
        this.credentialModel = null;
        this.networkAnalyzer = null;
        
        // Data stores
        this.userProfiles = new Map();
        this.behavioralPatterns = new Map();
        this.suspiciousActivities = new Map();
        this.investigationQueue = [];
        
        // Initialize services
        this.initializeConnections();
        this.initializeModels();
        this.startRealTimeMonitoring();
    }

    /**
     * Initialize database and messaging connections
     */
    async initializeConnections() {
        try {
            // Initialize Redis
            this.redisClient = redis.createClient({
                host: this.config.redisHost,
                port: this.config.redisPort,
                password: this.config.redisPassword,
                db: 7 // Separate DB for fraud detection
            });
            
            await this.redisClient.connect();
            console.log('Fraud Detection: Redis connected');
            
            // Initialize Kafka
            const kafkaClient = kafka.Kafka({
                clientId: 'fraud-detection-service',
                brokers: this.config.kafkaBrokers
            });
            
            this.kafkaProducer = kafkaClient.producer();
            await this.kafkaProducer.connect();
            
            this.kafkaConsumer = kafkaClient.consumer({ groupId: 'fraud-detection-group' });
            await this.kafkaConsumer.connect();
            await this.kafkaConsumer.subscribe({ 
                topics: ['user-activities', 'submissions', 'credential-verifications'] 
            });
            
            console.log('Fraud Detection: Kafka connected');
            
        } catch (error) {
            console.error('Failed to initialize connections:', error);
            throw error;
        }
    }

    /**
     * Initialize ML models for fraud detection
     */
    async initializeModels() {
        try {
            // Behavioral analysis model
            this.behavioralModel = new IsolationForest({
                n_estimators: 100,
                contamination: 0.1,
                randomState: 42
            });
            
            // Plagiarism detection model
            this.plagiarismModel = {
                textSimilarity: new CosineSimilarity(),
                semanticSimilarity: new CosineSimilarity(),
                structuralSimilarity: new JaroWinklerDistance()
            };
            
            // Credential verification model
            this.credentialModel = new LocalOutlierFactor({
                n_neighbors: 20,
                contamination: 0.1
            });
            
            // Network analysis
            this.networkAnalyzer = new Graph();
            
            console.log('Fraud Detection: ML models initialized');
            
        } catch (error) {
            console.error('Failed to initialize ML models:', error);
            throw error;
        }
    }

    /**
     * Start real-time monitoring
     */
    async startRealTimeMonitoring() {
        if (!this.config.realTimeProcessing) return;
        
        await this.kafkaConsumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());
                    await this.processRealTimeEvent(topic, event);
                } catch (error) {
                    console.error('Error processing real-time event:', error);
                }
            }
        });
        
        console.log('Fraud Detection: Real-time monitoring started');
    }

    /**
     * Process real-time events for fraud detection
     */
    async processRealTimeEvent(topic, event) {
        try {
            switch (topic) {
                case 'user-activities':
                    await this.analyzeUserActivity(event);
                    break;
                case 'submissions':
                    await this.analyzeSubmission(event);
                    break;
                case 'credential-verifications':
                    await this.analyzeCredentialVerification(event);
                    break;
            }
        } catch (error) {
            console.error('Error processing real-time event:', error);
        }
    }

    /**
     * Analyze user activity for behavioral anomalies
     */
    async analyzeUserActivity(activity) {
        const { userId, activityType, timestamp, metadata } = activity;
        
        // Get user behavioral profile
        let userProfile = await this.getUserBehavioralProfile(userId);
        
        // Update profile with new activity
        userProfile = await this.updateBehavioralProfile(userProfile, activity);
        
        // Extract features for anomaly detection
        const features = this.extractBehavioralFeatures(userProfile);
        
        // Detect anomalies
        const anomalyScore = this.behavioralModel.decision_function([features])[0];
        const isAnomalous = anomalyScore < this.config.anomalyThreshold;
        
        if (isAnomalous) {
            const alert = {
                id: crypto.randomUUID(),
                type: 'behavioral_anomaly',
                userId,
                activityType,
                anomalyScore,
                timestamp: new Date().toISOString(),
                severity: this.calculateSeverity(anomalyScore),
                details: {
                    activity,
                    userProfile: this.sanitizeProfile(userProfile),
                    features
                }
            };
            
            await this.handleFraudAlert(alert);
        }
        
        // Update user profile
        await this.saveUserBehavioralProfile(userId, userProfile);
    }

    /**
     * Analyze assignment submission for plagiarism
     */
    async analyzeSubmission(submission) {
        const { 
            submissionId, 
            userId, 
            assignmentId, 
            content, 
            timestamp 
        } = submission;
        
        try {
            // Get similar submissions for comparison
            const similarSubmissions = await this.getSimilarSubmissions(
                assignmentId, 
                userId, 
                content
            );
            
            // Calculate plagiarism scores
            const plagiarismAnalysis = await this.calculatePlagiarismScores(
                content, 
                similarSubmissions
            );
            
            // Determine if plagiarism is detected
            const maxSimilarity = Math.max(
                ...Object.values(plagiarismAnalysis.similarityScores)
            );
            
            if (maxSimilarity > this.config.plagiarismThreshold) {
                const alert = {
                    id: crypto.randomUUID(),
                    type: 'plagiarism_detected',
                    userId,
                    submissionId,
                    assignmentId,
                    maxSimilarity,
                    timestamp: new Date().toISOString(),
                    severity: this.calculatePlagiarismSeverity(maxSimilarity),
                    details: {
                        submission,
                        plagiarismAnalysis,
                        similarSubmissions: similarSubmissions.map(s => ({
                            submissionId: s.submissionId,
                            userId: s.userId,
                            similarity: plagiarismAnalysis.similarityScores[s.submissionId]
                        }))
                    }
                };
                
                await this.handleFraudAlert(alert);
            }
            
            // Store plagiarism analysis for future reference
            await this.storePlagiarismAnalysis(submissionId, plagiarismAnalysis);
            
        } catch (error) {
            console.error('Error analyzing submission:', error);
        }
    }

    /**
     * Analyze credential verification for fraud
     */
    async analyzeCredentialVerification(verification) {
        const { 
            userId, 
            credentialType, 
            credentialData, 
            verificationResult,
            timestamp 
        } = verification;
        
        try {
            // Get user's credential history
            const credentialHistory = await this.getUserCredentialHistory(userId);
            
            // Extract features for fraud detection
            const features = this.extractCredentialFeatures(
                credentialData, 
                verificationResult, 
                credentialHistory
            );
            
            // Detect anomalies in credential verification
            const anomalyScore = this.credentialModel.decision_function([features])[0];
            const isAnomalous = anomalyScore < this.config.anomalyThreshold;
            
            if (isAnomalous || !verificationResult.isValid) {
                const alert = {
                    id: crypto.randomUUID(),
                    type: 'credential_fraud',
                    userId,
                    credentialType,
                    verificationResult,
                    anomalyScore,
                    timestamp: new Date().toISOString(),
                    severity: this.calculateCredentialSeverity(anomalyScore, verificationResult),
                    details: {
                        verification,
                        credentialHistory,
                        features
                    }
                };
                
                await this.handleFraudAlert(alert);
            }
            
            // Update credential history
            await this.updateCredentialHistory(userId, verification);
            
        } catch (error) {
            console.error('Error analyzing credential verification:', error);
        }
    }

    /**
     * Perform network analysis for fraud ring detection
     */
    async performNetworkAnalysis(userId) {
        try {
            // Build user interaction network
            const network = await this.buildUserNetwork(userId);
            
            // Analyze network properties
            const networkMetrics = this.calculateNetworkMetrics(network);
            
            // Detect suspicious patterns
            const suspiciousPatterns = this.detectSuspiciousNetworkPatterns(
                network, 
                networkMetrics
            );
            
            if (suspiciousPatterns.length > 0) {
                const alert = {
                    id: crypto.randomUUID(),
                    type: 'network_fraud',
                    userId,
                    timestamp: new Date().toISOString(),
                    severity: 'high',
                    details: {
                        networkMetrics,
                        suspiciousPatterns,
                        networkData: this.sanitizeNetworkData(network)
                    }
                };
                
                await this.handleFraudAlert(alert);
            }
            
        } catch (error) {
            console.error('Error in network analysis:', error);
        }
    }

    /**
     * Handle fraud alerts with automated responses
     */
    async handleFraudAlert(alert) {
        try {
            // Store alert
            await this.storeFraudAlert(alert);
            
            // Emit alert for real-time monitoring
            this.emit('fraud_alert', alert);
            
            // Send to Kafka for downstream processing
            await this.kafkaProducer.send({
                topic: 'fraud-alerts',
                messages: [{
                    key: alert.id,
                    value: JSON.stringify(alert)
                }]
            });
            
            // Automated investigation if enabled
            if (this.config.autoInvestigation) {
                await this.initiateAutomatedInvestigation(alert);
            }
            
            // Apply immediate preventive measures
            await this.applyPreventiveMeasures(alert);
            
            console.log(`Fraud alert generated: ${alert.type} for user ${alert.userId}`);
            
        } catch (error) {
            console.error('Error handling fraud alert:', error);
        }
    }

    /**
     * Initiate automated investigation
     */
    async initiateAutomatedInvestigation(alert) {
        try {
            const investigation = {
                id: crypto.randomUUID(),
                alertId: alert.id,
                userId: alert.userId,
                type: alert.type,
                status: 'initiated',
                priority: this.calculateInvestigationPriority(alert),
                createdAt: new Date().toISOString(),
                steps: [],
                evidence: [],
                findings: [],
                recommendations: []
            };
            
            // Add to investigation queue
            this.investigationQueue.push(investigation);
            
            // Execute investigation steps
            await this.executeInvestigationSteps(investigation);
            
            // Generate investigation report
            const report = await this.generateInvestigationReport(investigation);
            
            // Store investigation results
            await this.storeInvestigationResults(investigation, report);
            
            // Send notification to administrators
            await this.notifyAdministrators(investigation, report);
            
        } catch (error) {
            console.error('Error in automated investigation:', error);
        }
    }

    /**
     * Execute investigation steps
     */
    async executeInvestigationSteps(investigation) {
        const steps = [
            'collect_user_history',
            'analyze_behavioral_patterns',
            'check_network_connections',
            'verify_credentials',
            'cross_reference_similar_cases'
        ];
        
        for (const step of steps) {
            try {
                const result = await this.executeInvestigationStep(investigation, step);
                investigation.steps.push({
                    step,
                    status: 'completed',
                    result,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                investigation.steps.push({
                    step,
                    status: 'failed',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    /**
     * Execute individual investigation step
     */
    async executeInvestigationStep(investigation, step) {
        switch (step) {
            case 'collect_user_history':
                return await this.collectUserHistory(investigation.userId);
            case 'analyze_behavioral_patterns':
                return await this.analyzeBehavioralPatterns(investigation.userId);
            case 'check_network_connections':
                return await this.checkNetworkConnections(investigation.userId);
            case 'verify_credentials':
                return await this.verifyUserCredentials(investigation.userId);
            case 'cross_reference_similar_cases':
                return await this.crossReferenceSimilarCases(investigation);
            default:
                throw new Error(`Unknown investigation step: ${step}`);
        }
    }

    /**
     * Apply preventive measures based on alert severity
     */
    async applyPreventiveMeasures(alert) {
        const measures = [];
        
        switch (alert.severity) {
            case 'critical':
                measures.push('suspend_account', 'block_ip', 'notify_admins');
                break;
            case 'high':
                measures.push('restrict_access', 'require_verification', 'monitor_closely');
                break;
            case 'medium':
                measures.push('additional_verification', 'monitor_closely');
                break;
            case 'low':
                measures.push('log_activity', 'periodic_review');
                break;
        }
        
        for (const measure of measures) {
            try {
                await this.applyPreventiveMeasure(alert.userId, measure);
                console.log(`Applied preventive measure: ${measure} for user ${alert.userId}`);
            } catch (error) {
                console.error(`Failed to apply measure ${measure}:`, error);
            }
        }
    }

    /**
     * Calculate plagiarism similarity scores
     */
    async calculatePlagiarismScores(content, similarSubmissions) {
        const similarityScores = {};
        
        for (const submission of similarSubmissions) {
            // Text similarity
            const textSim = this.plagiarismModel.textSimilarity.getSimilarity(
                content.toLowerCase(),
                submission.content.toLowerCase()
            );
            
            // Semantic similarity (simplified)
            const semanticSim = this.calculateSemanticSimilarity(content, submission.content);
            
            // Structural similarity
            const structuralSim = 1 - this.plagiarismModel.structuralSimilarity.distance(
                content,
                submission.content
            );
            
            // Combined similarity score
            const combinedSim = (textSim * 0.4 + semanticSim * 0.4 + structuralSim * 0.2);
            
            similarityScores[submission.submissionId] = combinedSim;
        }
        
        return {
            similarityScores,
            maxSimilarity: Math.max(...Object.values(similarityScores)),
            averageSimilarity: Object.values(similarityScores).reduce((a, b) => a + b, 0) / 
                               Object.values(similarityScores).length
        };
    }

    /**
     * Extract behavioral features for ML model
     */
    extractBehavioralFeatures(userProfile) {
        const features = [];
        
        // Login frequency
        features.push(userProfile.loginFrequency || 0);
        
        // Activity time patterns
        features.push(userProfile.activityIrregularity || 0);
        
        // Device diversity
        features.push(userProfile.deviceDiversity || 0);
        
        // Location diversity
        features.push(userProfile.locationDiversity || 0);
        
        // Submission patterns
        features.push(userProfile.submissionRegularity || 0);
        
        // Performance patterns
        features.push(userProfile.performanceVariability || 0);
        
        // Social interaction patterns
        features.push(userProfile.socialInteractionScore || 0);
        
        return features;
    }

    /**
     * Calculate semantic similarity between texts
     */
    calculateSemanticSimilarity(text1, text2) {
        // Simplified semantic similarity calculation
        // In production, use word embeddings or transformers
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const intersection = words1.filter(word => words2.includes(word));
        const union = [...new Set([...words1, ...words2])];
        
        return intersection.length / union.length;
    }

    /**
     * Get user behavioral profile
     */
    async getUserBehavioralProfile(userId) {
        try {
            const profileData = await this.redisClient.get(`behavioral_profile:${userId}`);
            return profileData ? JSON.parse(profileData) : this.createDefaultProfile(userId);
        } catch (error) {
            return this.createDefaultProfile(userId);
        }
    }

    /**
     * Create default behavioral profile
     */
    createDefaultProfile(userId) {
        return {
            userId,
            createdAt: new Date().toISOString(),
            loginFrequency: 0,
            activityIrregularity: 0,
            deviceDiversity: 0,
            locationDiversity: 0,
            submissionRegularity: 0,
            performanceVariability: 0,
            socialInteractionScore: 0,
            activities: [],
            devices: new Set(),
            locations: new Set(),
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Update behavioral profile with new activity
     */
    async updateBehavioralProfile(profile, activity) {
        profile.activities.push(activity);
        profile.lastUpdated = new Date().toISOString();
        
        // Update device diversity
        if (activity.metadata?.deviceId) {
            profile.devices.add(activity.metadata.deviceId);
            profile.deviceDiversity = profile.devices.size;
        }
        
        // Update location diversity
        if (activity.metadata?.location) {
            profile.locations.add(activity.metadata.location);
            profile.locationDiversity = profile.locations.size;
        }
        
        // Recalculate other metrics
        profile.loginFrequency = this.calculateLoginFrequency(profile.activities);
        profile.activityIrregularity = this.calculateActivityIrregularity(profile.activities);
        profile.submissionRegularity = this.calculateSubmissionRegularity(profile.activities);
        
        return profile;
    }

    /**
     * Helper methods for calculating metrics
     */
    calculateLoginFrequency(activities) {
        const loginActivities = activities.filter(a => a.activityType === 'login');
        const days = new Set(loginActivities.map(a => 
            new Date(a.timestamp).toDateString()
        ));
        return days.size;
    }

    calculateActivityIrregularity(activities) {
        // Calculate variance in activity timing
        const timestamps = activities.map(a => new Date(a.timestamp).getTime());
        const mean = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
        const variance = timestamps.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / timestamps.length;
        return Math.sqrt(variance);
    }

    calculateSubmissionRegularity(activities) {
        const submissions = activities.filter(a => a.activityType === 'submission');
        if (submissions.length < 2) return 0;
        
        const intervals = [];
        for (let i = 1; i < submissions.length; i++) {
            const interval = new Date(submissions[i].timestamp) - 
                           new Date(submissions[i-1].timestamp);
            intervals.push(interval);
        }
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / intervals.length;
        return 1 / (Math.sqrt(variance) / mean); // Higher is more regular
    }

    calculateSeverity(anomalyScore) {
        if (anomalyScore < -0.5) return 'critical';
        if (anomalyScore < -0.2) return 'high';
        if (anomalyScore < 0) return 'medium';
        return 'low';
    }

    calculatePlagiarismSeverity(similarity) {
        if (similarity > 0.95) return 'critical';
        if (similarity > 0.9) return 'high';
        if (similarity > 0.85) return 'medium';
        return 'low';
    }

    calculateCredentialSeverity(anomalyScore, verificationResult) {
        if (!verificationResult.isValid) return 'critical';
        if (anomalyScore < -0.3) return 'high';
        if (anomalyScore < 0) return 'medium';
        return 'low';
    }

    sanitizeProfile(profile) {
        const sanitized = { ...profile };
        delete sanitized.activities; // Remove sensitive activity data
        return sanitized;
    }

    sanitizeNetworkData(network) {
        // Remove sensitive network data while preserving structure
        return {
            nodeCount: network.order,
            edgeCount: network.size,
            density: network.density,
            clustering: algos.averageClustering(network)
        };
    }

    /**
     * Get fraud detection statistics
     */
    async getFraudStatistics(timeRange = '24h') {
        try {
            const stats = {
                timeRange,
                totalAlerts: 0,
                alertsByType: {},
                alertsBySeverity: {},
                investigations: {
                    total: 0,
                    completed: 0,
                    inProgress: 0
                },
                preventiveMeasures: {
                    applied: 0,
                    byType: {}
                },
                detectionAccuracy: {
                    truePositives: 0,
                    falsePositives: 0,
                    precision: 0
                }
            };
            
            // Get statistics from Redis or database
            const alerts = await this.getFraudAlerts(timeRange);
            stats.totalAlerts = alerts.length;
            
            alerts.forEach(alert => {
                stats.alertsByType[alert.type] = (stats.alertsByType[alert.type] || 0) + 1;
                stats.alertsBySeverity[alert.severity] = (stats.alertsBySeverity[alert.severity] || 0) + 1;
            });
            
            return stats;
            
        } catch (error) {
            console.error('Error getting fraud statistics:', error);
            throw error;
        }
    }

    /**
     * Health check for fraud detection service
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: this.redisClient ? 'connected' : 'disconnected',
                kafka: this.kafkaProducer ? 'connected' : 'disconnected'
            },
            models: {
                behavioral: this.behavioralModel ? 'loaded' : 'not loaded',
                plagiarism: this.plagiarismModel ? 'loaded' : 'not loaded',
                credential: this.credentialModel ? 'loaded' : 'not loaded'
            },
            metrics: {
                alertsProcessed: await this.getAlertsProcessed(),
                investigationsActive: this.investigationQueue.length,
                averageProcessingTime: await this.getAverageProcessingTime()
            }
        };
        
        return health;
    }

    // Placeholder methods for implementation
    async getSimilarSubmissions(assignmentId, userId, content) { return []; }
    async getUserCredentialHistory(userId) { return []; }
    async buildUserNetwork(userId) { return new Graph(); }
    async calculateNetworkMetrics(network) { return {}; }
    async detectSuspiciousNetworkPatterns(network, metrics) { return []; }
    async storeFraudAlert(alert) { /* Store in database */ }
    async storePlagiarismAnalysis(submissionId, analysis) { /* Store in database */ }
    async saveUserBehavioralProfile(userId, profile) { /* Store in Redis */ }
    async updateCredentialHistory(userId, verification) { /* Update in database */ }
    async collectUserHistory(userId) { return {}; }
    async analyzeBehavioralPatterns(userId) { return {}; }
    async checkNetworkConnections(userId) { return {}; }
    async verifyUserCredentials(userId) { return {}; }
    async crossReferenceSimilarCases(investigation) { return {}; }
    async generateInvestigationReport(investigation) { return {}; }
    async storeInvestigationResults(investigation, report) { /* Store in database */ }
    async notifyAdministrators(investigation, report) { /* Send notifications */ }
    async applyPreventiveMeasure(userId, measure) { /* Apply measure */ }
    async getFraudAlerts(timeRange) { return []; }
    async getAlertsProcessed() { return 0; }
    async getAverageProcessingTime() { return 0; }
    extractCredentialFeatures(credentialData, verificationResult, history) { return []; }
    calculateInvestigationPriority(alert) { return 'medium'; }
}

module.exports = new FraudDetectionService();
