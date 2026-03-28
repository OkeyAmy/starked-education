/**
 * Real-Time Anomaly Detection System
 * Detects suspicious activities and patterns in real-time using stream processing
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const { 
    IsolationForest, 
    LocalOutlierFactor, 
    OneClassSVM 
} = require('scikit-learn');
const kafka = require('kafkajs');
const redis = require('redis');
const { 
    slidingWindow, 
    exponentialSmoothing 
} = require('simple-statistics');

class RealTimeAnomalyDetector extends EventEmitter {
    constructor() {
        super();
        
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            kafkaBrokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
            windowSize: 100, // Number of events in sliding window
            windowDuration: 5 * 60 * 1000, // 5 minutes
            anomalyThreshold: 0.7,
            alertThreshold: 0.8,
            maxFeatures: 50,
            processingBatchSize: 10,
            alertCooldown: 30 * 1000 // 30 seconds
        };
        
        // Initialize connections
        this.redisClient = null;
        this.kafkaProducer = null;
        this.kafkaConsumer = null;
        
        // ML models for different anomaly types
        this.models = {
            behavioral: new IsolationForest({
                n_estimators: 100,
                contamination: 0.1,
                randomState: 42
            }),
            performance: new LocalOutlierFactor({
                n_neighbors: 20,
                contamination: 0.1
            }),
            temporal: new OneClassSVM({
                kernel: 'rbf',
                gamma: 'scale',
                nu: 0.1
            })
        };
        
        // Data stores
        this.eventWindows = new Map();
        this.featureExtractors = new Map();
        this.anomalyHistory = new Map();
        this.alertCooldowns = new Map();
        
        // Initialize services
        this.initializeConnections();
        this.initializeFeatureExtractors();
        this.startRealTimeProcessing();
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
                db: 10 // Separate DB for anomaly detection
            });
            
            await this.redisClient.connect();
            console.log('Anomaly Detector: Redis connected');
            
            // Initialize Kafka
            const kafkaClient = kafka.Kafka({
                clientId: 'anomaly-detection-service',
                brokers: this.config.kafkaBrokers
            });
            
            this.kafkaProducer = kafkaClient.producer();
            await this.kafkaProducer.connect();
            
            this.kafkaConsumer = kafkaClient.consumer({ 
                groupId: 'anomaly-detection-group' 
            });
            await this.kafkaConsumer.connect();
            await this.kafkaConsumer.subscribe({ 
                topics: [
                    'user-activities',
                    'submissions',
                    'login-attempts',
                    'credential-verifications',
                    'course-progress',
                    'payment-events'
                ] 
            });
            
            console.log('Anomaly Detector: Kafka connected');
            
        } catch (error) {
            console.error('Failed to initialize connections:', error);
            throw error;
        }
    }

    /**
     * Initialize feature extractors for different event types
     */
    initializeFeatureExtractors() {
        this.featureExtractors.set('user-activities', {
            extract: this.extractUserActivityFeatures.bind(this),
            model: this.models.behavioral
        });
        
        this.featureExtractors.set('submissions', {
            extract: this.extractSubmissionFeatures.bind(this),
            model: this.models.performance
        });
        
        this.featureExtractors.set('login-attempts', {
            extract: this.extractLoginFeatures.bind(this),
            model: this.models.behavioral
        });
        
        this.featureExtractors.set('credential-verifications', {
            extract: this.extractCredentialFeatures.bind(this),
            model: this.models.behavioral
        });
        
        this.featureExtractors.set('course-progress', {
            extract: this.extractProgressFeatures.bind(this),
            model: this.models.temporal
        });
        
        this.featureExtractors.set('payment-events', {
            extract: this.extractPaymentFeatures.bind(this),
            model: this.models.behavioral
        });
    }

    /**
     * Start real-time processing
     */
    async startRealTimeProcessing() {
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
        
        console.log('Real-time anomaly detection started');
    }

    /**
     * Process real-time events for anomaly detection
     */
    async processRealTimeEvent(topic, event) {
        try {
            const eventId = crypto.randomUUID();
            const timestamp = Date.now();
            
            // Add metadata to event
            const enrichedEvent = {
                ...event,
                eventId,
                topic,
                processingTimestamp: timestamp
            };
            
            // Get or create event window for the user/entity
            const windowKey = this.getWindowKey(event);
            let eventWindow = this.eventWindows.get(windowKey);
            
            if (!eventWindow) {
                eventWindow = {
                    key: windowKey,
                    events: [],
                    features: [],
                    lastAnomaly: null,
                    createdAt: timestamp
                };
                this.eventWindows.set(windowKey, eventWindow);
            }
            
            // Add event to window
            eventWindow.events.push(enrichedEvent);
            
            // Maintain window size
            if (eventWindow.events.length > this.config.windowSize) {
                eventWindow.events.shift();
            }
            
            // Extract features
            const extractor = this.featureExtractors.get(topic);
            if (extractor) {
                const features = extractor.extract(eventWindow.events);
                eventWindow.features = features;
                
                // Detect anomalies
                await this.detectAnomalies(windowKey, eventWindow, topic, extractor.model);
            }
            
            // Clean old windows
            this.cleanupOldWindows();
            
        } catch (error) {
            console.error('Error processing real-time event:', error);
        }
    }

    /**
     * Detect anomalies in event window
     */
    async detectAnomalies(windowKey, eventWindow, topic, model) {
        try {
            const features = eventWindow.features;
            
            if (features.length === 0) return;
            
            // Prepare feature vector
            const featureVector = this.prepareFeatureVector(features);
            
            // Detect anomaly
            const anomalyScore = model.decision_function([featureVector])[0];
            const isAnomalous = anomalyScore < this.config.anomalyThreshold;
            
            if (isAnomalous) {
                const severity = this.calculateAnomalySeverity(anomalyScore);
                
                // Check cooldown
                const cooldownKey = `${windowKey}:${topic}`;
                if (this.isInCooldown(cooldownKey)) {
                    return;
                }
                
                // Create anomaly alert
                const alert = {
                    id: crypto.randomUUID(),
                    type: 'real_time_anomaly',
                    windowKey,
                    topic,
                    anomalyScore,
                    severity,
                    timestamp: new Date().toISOString(),
                    events: eventWindow.events.slice(-10), // Last 10 events
                    features: features,
                    model: model.constructor.name,
                    confidence: this.calculateConfidence(anomalyScore, features.length)
                };
                
                // Handle anomaly alert
                await this.handleAnomalyAlert(alert);
                
                // Update event window
                eventWindow.lastAnomaly = alert;
                
                // Set cooldown
                this.setCooldown(cooldownKey);
            }
            
        } catch (error) {
            console.error('Error detecting anomalies:', error);
        }
    }

    /**
     * Handle anomaly alerts with real-time responses
     */
    async handleAnomalyAlert(alert) {
        try {
            // Store alert
            await this.storeAnomalyAlert(alert);
            
            // Emit alert for real-time monitoring
            this.emit('anomaly_detected', alert);
            
            // Send to Kafka for downstream processing
            await this.kafkaProducer.send({
                topic: 'anomaly-alerts',
                messages: [{
                    key: alert.id,
                    value: JSON.stringify(alert)
                }]
            });
            
            // Apply immediate response based on severity
            await this.applyImmediateResponse(alert);
            
            console.log(`Real-time anomaly detected: ${alert.type} - ${alert.severity}`);
            
        } catch (error) {
            console.error('Error handling anomaly alert:', error);
        }
    }

    /**
     * Apply immediate response to anomaly
     */
    async applyImmediateResponse(alert) {
        try {
            const responses = [];
            
            switch (alert.severity) {
                case 'critical':
                    responses.push('suspend_account', 'block_ip', 'immediate_notification');
                    break;
                case 'high':
                    responses.push('restrict_access', 'enhanced_monitoring', 'notify_admins');
                    break;
                case 'medium':
                    responses.push('additional_verification', 'log_activity');
                    break;
                case 'low':
                    responses.push('monitor_closely', 'log_activity');
                    break;
            }
            
            for (const response of responses) {
                await this.executeResponse(alert, response);
            }
            
        } catch (error) {
            console.error('Error applying immediate response:', error);
        }
    }

    /**
     * Execute specific response action
     */
    async executeResponse(alert, response) {
        try {
            switch (response) {
                case 'suspend_account':
                    await this.suspendAccount(alert);
                    break;
                case 'block_ip':
                    await this.blockIPAddress(alert);
                    break;
                case 'restrict_access':
                    await this.restrictAccess(alert);
                    break;
                case 'additional_verification':
                    await this.requireAdditionalVerification(alert);
                    break;
                case 'enhanced_monitoring':
                    await this.enableEnhancedMonitoring(alert);
                    break;
                case 'immediate_notification':
                case 'notify_admins':
                    await this.notifyAdministrators(alert);
                    break;
                case 'log_activity':
                case 'monitor_closely':
                    await this.logAnomalousActivity(alert);
                    break;
            }
            
            console.log(`Executed response: ${response} for anomaly ${alert.id}`);
            
        } catch (error) {
            console.error(`Error executing response ${response}:`, error);
        }
    }

    /**
     * Feature extraction methods for different event types
     */
    extractUserActivityFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Time-based features
        const timestamps = events.map(e => new Date(e.timestamp).getTime());
        const timeDiffs = [];
        for (let i = 1; i < timestamps.length; i++) {
            timeDiffs.push(timestamps[i] - timestamps[i-1]);
        }
        
        features.push({
            name: 'avg_time_between_events',
            value: timeDiffs.length > 0 ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length : 0
        });
        
        features.push({
            name: 'time_variance',
            value: this.calculateVariance(timeDiffs)
        });
        
        // Activity frequency
        features.push({
            name: 'event_frequency',
            value: events.length / this.config.windowDuration
        });
        
        // Device diversity
        const devices = new Set(events.map(e => e.metadata?.deviceId).filter(Boolean));
        features.push({
            name: 'device_diversity',
            value: devices.size
        });
        
        // Location diversity
        const locations = new Set(events.map(e => e.metadata?.location).filter(Boolean));
        features.push({
            name: 'location_diversity',
            value: locations.size
        });
        
        // Activity type distribution
        const activityTypes = {};
        events.forEach(e => {
            activityTypes[e.activityType] = (activityTypes[e.activityType] || 0) + 1;
        });
        
        features.push({
            name: 'activity_entropy',
            value: this.calculateEntropy(Object.values(activityTypes))
        });
        
        return features;
    }

    extractSubmissionFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Submission frequency
        features.push({
            name: 'submission_frequency',
            value: events.length / this.config.windowDuration
        });
        
        // Time between submissions
        const timestamps = events.map(e => new Date(e.timestamp).getTime());
        const timeDiffs = [];
        for (let i = 1; i < timestamps.length; i++) {
            timeDiffs.push(timestamps[i] - timestamps[i-1]);
        }
        
        features.push({
            name: 'avg_time_between_submissions',
            value: timeDiffs.length > 0 ? timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length : 0
        });
        
        // Score patterns
        const scores = events.map(e => e.metadata?.score || 0).filter(s => s > 0);
        if (scores.length > 0) {
            features.push({
                name: 'score_variance',
                value: this.calculateVariance(scores)
            });
            
            features.push({
                name: 'score_trend',
                value: this.calculateTrend(scores)
            });
        }
        
        // Submission size patterns
        const sizes = events.map(e => e.metadata?.contentLength || 0).filter(s => s > 0);
        if (sizes.length > 0) {
            features.push({
                name: 'size_variance',
                value: this.calculateVariance(sizes)
            });
        }
        
        return features;
    }

    extractLoginFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Login frequency
        features.push({
            name: 'login_frequency',
            value: events.length / this.config.windowDuration
        });
        
        // Failed login ratio
        const failedLogins = events.filter(e => !e.success).length;
        features.push({
            name: 'failed_login_ratio',
            value: failedLogins / events.length
        });
        
        // Geographic patterns
        const locations = new Set(events.map(e => e.metadata?.location).filter(Boolean));
        features.push({
            name: 'location_diversity',
            value: locations.size
        });
        
        // Device patterns
        const devices = new Set(events.map(e => e.metadata?.deviceId).filter(Boolean));
        features.push({
            name: 'device_diversity',
            value: devices.size
        });
        
        // Time-based patterns
        const hours = events.map(e => new Date(e.timestamp).getHours());
        features.push({
            name: 'hour_entropy',
            value: this.calculateEntropy(hours)
        });
        
        return features;
    }

    extractCredentialFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Verification frequency
        features.push({
            name: 'verification_frequency',
            value: events.length / this.config.windowDuration
        });
        
        // Success rate
        const successful = events.filter(e => e.verificationResult?.isValid).length;
        features.push({
            name: 'success_rate',
            value: successful / events.length
        });
        
        // Credential type diversity
        const types = new Set(events.map(e => e.credentialType).filter(Boolean));
        features.push({
            name: 'credential_type_diversity',
            value: types.size
        });
        
        return features;
    }

    extractProgressFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Progress velocity
        const progressValues = events.map(e => e.metadata?.progress || 0);
        features.push({
            name: 'progress_velocity',
            value: this.calculateTrend(progressValues)
        });
        
        // Activity consistency
        const timeDiffs = [];
        const timestamps = events.map(e => new Date(e.timestamp).getTime());
        for (let i = 1; i < timestamps.length; i++) {
            timeDiffs.push(timestamps[i] - timestamps[i-1]);
        }
        
        features.push({
            name: 'activity_consistency',
            value: 1 / (this.calculateVariance(timeDiffs) + 1)
        });
        
        return features;
    }

    extractPaymentFeatures(events) {
        const features = [];
        
        if (events.length === 0) return features;
        
        // Payment frequency
        features.push({
            name: 'payment_frequency',
            value: events.length / this.config.windowDuration
        });
        
        // Amount patterns
        const amounts = events.map(e => e.metadata?.amount || 0).filter(a => a > 0);
        if (amounts.length > 0) {
            features.push({
                name: 'amount_variance',
                value: this.calculateVariance(amounts)
            });
            
            features.push({
                name: 'avg_amount',
                value: amounts.reduce((a, b) => a + b, 0) / amounts.length
            });
        }
        
        // Payment method diversity
        const methods = new Set(events.map(e => e.metadata?.paymentMethod).filter(Boolean));
        features.push({
            name: 'payment_method_diversity',
            value: methods.size
        });
        
        return features;
    }

    /**
     * Helper methods for feature calculation
     */
    prepareFeatureVector(features) {
        // Convert feature objects to numeric vector
        return features.map(f => f.value || 0);
    }

    calculateVariance(values) {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    }

    calculateEntropy(values) {
        const counts = {};
        values.forEach(v => {
            counts[v] = (counts[v] || 0) + 1;
        });
        
        const total = values.length;
        let entropy = 0;
        
        Object.values(counts).forEach(count => {
            const probability = count / total;
            if (probability > 0) {
                entropy -= probability * Math.log2(probability);
            }
        });
        
        return entropy;
    }

    calculateTrend(values) {
        if (values.length < 2) return 0;
        
        const n = values.length;
        const sumX = (n * (n - 1)) / 2;
        const sumY = values.reduce((a, b) => a + b, 0);
        const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        
        return slope;
    }

    calculateAnomalySeverity(anomalyScore) {
        if (anomalyScore < -0.8) return 'critical';
        if (anomalyScore < -0.5) return 'high';
        if (anomalyScore < -0.2) return 'medium';
        return 'low';
    }

    calculateConfidence(anomalyScore, featureCount) {
        // Higher confidence with more features and stronger anomaly signal
        const featureConfidence = Math.min(1, featureCount / 10);
        const signalConfidence = Math.abs(anomalyScore);
        return (featureConfidence + signalConfidence) / 2;
    }

    getWindowKey(event) {
        // Create window key based on user or entity
        return event.userId || event.entityId || 'anonymous';
    }

    isInCooldown(key) {
        const cooldown = this.alertCooldowns.get(key);
        return cooldown && (Date.now() - cooldown) < this.config.alertCooldown;
    }

    setCooldown(key) {
        this.alertCooldowns.set(key, Date.now());
    }

    cleanupOldWindows() {
        const cutoffTime = Date.now() - this.config.windowDuration;
        
        for (const [key, window] of this.eventWindows.entries()) {
            if (window.createdAt < cutoffTime) {
                this.eventWindows.delete(key);
            }
        }
    }

    // Response execution methods
    async suspendAccount(alert) {
        // Implement account suspension
        console.log(`Suspending account due to anomaly: ${alert.id}`);
    }

    async blockIPAddress(alert) {
        // Implement IP blocking
        console.log(`Blocking IP address due to anomaly: ${alert.id}`);
    }

    async restrictAccess(alert) {
        // Implement access restriction
        console.log(`Restricting access due to anomaly: ${alert.id}`);
    }

    async requireAdditionalVerification(alert) {
        // Implement additional verification requirement
        console.log(`Requiring additional verification due to anomaly: ${alert.id}`);
    }

    async enableEnhancedMonitoring(alert) {
        // Implement enhanced monitoring
        console.log(`Enabling enhanced monitoring due to anomaly: ${alert.id}`);
    }

    async notifyAdministrators(alert) {
        // Implement administrator notification
        console.log(`Notifying administrators of anomaly: ${alert.id}`);
    }

    async logAnomalousActivity(alert) {
        // Implement activity logging
        console.log(`Logging anomalous activity: ${alert.id}`);
    }

    async storeAnomalyAlert(alert) {
        // Store alert in database
        console.log(`Stored anomaly alert: ${alert.id}`);
    }

    // Public API methods
    async getAnomalyStatistics(timeRange = '1h') {
        try {
            const stats = {
                timeRange,
                totalAnomalies: 0,
                anomaliesByType: {},
                anomaliesBySeverity: {},
                activeWindows: this.eventWindows.size,
                averageProcessingTime: 0
            };
            
            // Get statistics from database
            const anomalies = await this.getAnomaliesFromDatabase(timeRange);
            stats.totalAnomalies = anomalies.length;
            
            anomalies.forEach(anomaly => {
                stats.anomaliesByType[anomaly.type] = (stats.anomaliesByType[anomaly.type] || 0) + 1;
                stats.anomaliesBySeverity[anomaly.severity] = (stats.anomaliesBySeverity[anomaly.severity] || 0) + 1;
            });
            
            return stats;
            
        } catch (error) {
            console.error('Error getting anomaly statistics:', error);
            throw error;
        }
    }

    async getAnomaliesFromDatabase(timeRange) {
        // Retrieve anomalies from database
        return [];
    }

    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: this.redisClient ? 'connected' : 'disconnected',
                kafka: this.kafkaProducer ? 'connected' : 'disconnected'
            },
            models: {
                behavioral: this.models.behavioral ? 'loaded' : 'not loaded',
                performance: this.models.performance ? 'loaded' : 'not loaded',
                temporal: this.models.temporal ? 'loaded' : 'not loaded'
            },
            metrics: {
                activeWindows: this.eventWindows.size,
                featureExtractors: this.featureExtractors.size,
                cooldownsActive: this.alertCooldowns.size
            }
        };
        
        return health;
    }
}

module.exports = new RealTimeAnomalyDetector();
