/**
 * Automated Investigation Service
 * Orchestrates automated investigation workflows for fraud detection
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const { 
    Graph, 
    algos 
} = require('graphology');
const redis = require('redis');
const axios = require('axios');

class AutomatedInvestigationService extends EventEmitter {
    constructor() {
        super();
        
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            investigationTimeout: 24 * 60 * 60 * 1000, // 24 hours
            maxConcurrentInvestigations: 10,
            evidenceRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
            autoEscalationThreshold: 0.8,
            notificationEndpoints: {
                email: process.env.NOTIFICATION_EMAIL_ENDPOINT,
                slack: process.env.NOTIFICATION_SLACK_WEBHOOK,
                teams: process.env.NOTIFICATION_TEAMS_WEBHOOK
            }
        };
        
        // Initialize connections
        this.redisClient = null;
        
        // Investigation state
        this.activeInvestigations = new Map();
        this.investigationQueue = [];
        this.investigationTemplates = new Map();
        this.evidenceCollectors = new Map();
        
        // Initialize services
        this.initializeConnections();
        this.loadInvestigationTemplates();
        this.initializeEvidenceCollectors();
        this.startInvestigationProcessor();
    }

    /**
     * Initialize database connections
     */
    async initializeConnections() {
        try {
            this.redisClient = redis.createClient({
                host: this.config.redisHost,
                port: this.config.redisPort,
                password: this.config.redisPassword,
                db: 11 // Separate DB for investigations
            });
            
            await this.redisClient.connect();
            console.log('Investigation Service: Redis connected');
            
        } catch (error) {
            console.error('Failed to initialize connections:', error);
            throw error;
        }
    }

    /**
     * Load investigation templates for different fraud types
     */
    async loadInvestigationTemplates() {
        // Plagiarism investigation template
        this.investigationTemplates.set('plagiarism', {
            id: 'plagiarism_template',
            name: 'Plagiarism Investigation',
            steps: [
                'collect_submission_evidence',
                'analyze_similarity_patterns',
                'check_authorship_patterns',
                'verify_source_integrity',
                'cross_reference_historical_cases',
                'generate_plagiarism_report'
            ],
            evidenceTypes: ['submission_content', 'similarity_analysis', 'authorship_metadata', 'source_verification'],
            severityMapping: {
                'critical': 'immediate_escalation',
                'high': 'senior_reviewer',
                'medium': 'standard_review',
                'low': 'automated_resolution'
            },
            autoResolutionThreshold: 0.9
        });

        // Credential fraud investigation template
        this.investigationTemplates.set('credential_fraud', {
            id: 'credential_fraud_template',
            name: 'Credential Fraud Investigation',
            steps: [
                'collect_credential_evidence',
                'verify_institution_authenticity',
                'analyze_issuance_patterns',
                'check_blockchain_integrity',
                'cross_reference_user_history',
                'generate_fraud_assessment'
            ],
            evidenceTypes: ['credential_data', 'institution_verification', 'blockchain_records', 'user_history'],
            severityMapping: {
                'critical': 'immediate_escalation',
                'high': 'senior_reviewer',
                'medium': 'standard_review',
                'low': 'automated_resolution'
            },
            autoResolutionThreshold: 0.85
        });

        // Behavioral anomaly investigation template
        this.investigationTemplates.set('behavioral_anomaly', {
            id: 'behavioral_anomaly_template',
            name: 'Behavioral Anomaly Investigation',
            steps: [
                'collect_behavioral_evidence',
                'analyze_activity_patterns',
                'check_device_fingerprints',
                'verify_geographic_consistency',
                'assess_risk_factors',
                'generate_behavioral_report'
            ],
            evidenceTypes: ['activity_logs', 'device_data', 'location_data', 'risk_assessment'],
            severityMapping: {
                'critical': 'immediate_escalation',
                'high': 'senior_reviewer',
                'medium': 'standard_review',
                'low': 'automated_resolution'
            },
            autoResolutionThreshold: 0.8
        });

        console.log(`Loaded ${this.investigationTemplates.size} investigation templates`);
    }

    /**
     * Initialize evidence collectors
     */
    initializeEvidenceCollectors() {
        this.evidenceCollectors.set('submission_evidence', {
            collect: this.collectSubmissionEvidence.bind(this),
            priority: 'high'
        });

        this.evidenceCollectors.set('user_behavior_evidence', {
            collect: this.collectUserBehaviorEvidence.bind(this),
            priority: 'high'
        });

        this.evidenceCollectors.set('credential_evidence', {
            collect: this.collectCredentialEvidence.bind(this),
            priority: 'high'
        });

        this.evidenceCollectors.set('network_evidence', {
            collect: this.collectNetworkEvidence.bind(this),
            priority: 'medium'
        });

        this.evidenceCollectors.set('historical_evidence', {
            collect: this.collectHistoricalEvidence.bind(this),
            priority: 'medium'
        });
    }

    /**
     * Start investigation processor
     */
    startInvestigationProcessor() {
        setInterval(async () => {
            await this.processInvestigationQueue();
        }, 5000); // Process every 5 seconds
        
        console.log('Investigation processor started');
    }

    /**
     * Initiate automated investigation
     */
    async initiateInvestigation(alert) {
        try {
            const investigationId = crypto.randomUUID();
            
            // Get investigation template
            const template = this.investigationTemplates.get(alert.type);
            if (!template) {
                throw new Error(`No investigation template found for type: ${alert.type}`);
            }

            // Create investigation object
            const investigation = {
                id: investigationId,
                alertId: alert.id,
                type: alert.type,
                userId: alert.userId,
                severity: alert.severity,
                status: 'initiated',
                priority: this.calculateInvestigationPriority(alert),
                template: template,
                steps: [],
                evidence: [],
                findings: [],
                recommendations: [],
                timeline: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                assignedTo: null,
                escalated: false,
                autoResolved: false
            };

            // Add to active investigations
            this.activeInvestigations.set(investigationId, investigation);

            // Add to queue for processing
            this.investigationQueue.push({
                investigation,
                timestamp: Date.now()
            });

            // Store investigation
            await this.storeInvestigation(investigation);

            // Emit investigation started event
            this.emit('investigation_started', investigation);

            console.log(`Investigation initiated: ${investigationId} for alert ${alert.id}`);
            return investigation;

        } catch (error) {
            console.error('Error initiating investigation:', error);
            throw error;
        }
    }

    /**
     * Process investigation queue
     */
    async processInvestigationQueue() {
        if (this.investigationQueue.length === 0) return;
        
        // Check concurrent investigation limit
        if (this.activeInvestigations.size >= this.config.maxConcurrentInvestigations) {
            return;
        }

        // Get next investigation from queue
        const queueItem = this.investigationQueue.shift();
        const { investigation } = queueItem;

        try {
            await this.executeInvestigation(investigation);
        } catch (error) {
            console.error(`Error processing investigation ${investigation.id}:`, error);
            investigation.status = 'failed';
            investigation.error = error.message;
            await this.storeInvestigation(investigation);
        }
    }

    /**
     * Execute investigation steps
     */
    async executeInvestigation(investigation) {
        const template = investigation.template;
        
        try {
            investigation.status = 'in_progress';
            investigation.updatedAt = new Date().toISOString();
            
            // Execute investigation steps
            for (const stepName of template.steps) {
                const stepResult = await this.executeInvestigationStep(investigation, stepName);
                
                investigation.steps.push({
                    name: stepName,
                    status: 'completed',
                    result: stepResult,
                    timestamp: new Date().toISOString(),
                    duration: stepResult.duration || 0
                });

                // Add timeline entry
                investigation.timeline.push({
                    event: 'step_completed',
                    step: stepName,
                    timestamp: new Date().toISOString(),
                    details: stepResult.summary
                });

                // Update investigation in storage
                await this.storeInvestigation(investigation);

                // Check for early termination conditions
                if (stepResult.terminateInvestigation) {
                    break;
                }
            }

            // Analyze evidence and generate findings
            await this.analyzeEvidence(investigation);
            
            // Generate recommendations
            await this.generateRecommendations(investigation);
            
            // Determine investigation outcome
            await this.determineOutcome(investigation);

        } catch (error) {
            console.error(`Error executing investigation ${investigation.id}:`, error);
            investigation.status = 'failed';
            investigation.error = error.message;
        }

        // Finalize investigation
        await this.finalizeInvestigation(investigation);
    }

    /**
     * Execute individual investigation step
     */
    async executeInvestigationStep(investigation, stepName) {
        const startTime = Date.now();
        
        try {
            let result;
            
            switch (stepName) {
                case 'collect_submission_evidence':
                    result = await this.collectSubmissionEvidence(investigation);
                    break;
                case 'analyze_similarity_patterns':
                    result = await this.analyzeSimilarityPatterns(investigation);
                    break;
                case 'check_authorship_patterns':
                    result = await this.checkAuthorshipPatterns(investigation);
                    break;
                case 'verify_source_integrity':
                    result = await this.verifySourceIntegrity(investigation);
                    break;
                case 'collect_credential_evidence':
                    result = await this.collectCredentialEvidence(investigation);
                    break;
                case 'verify_institution_authenticity':
                    result = await this.verifyInstitutionAuthenticity(investigation);
                    break;
                case 'analyze_issuance_patterns':
                    result = await this.analyzeIssuancePatterns(investigation);
                    break;
                case 'collect_behavioral_evidence':
                    result = await this.collectUserBehaviorEvidence(investigation);
                    break;
                case 'analyze_activity_patterns':
                    result = await this.analyzeActivityPatterns(investigation);
                    break;
                case 'check_device_fingerprints':
                    result = await this.checkDeviceFingerprints(investigation);
                    break;
                case 'cross_reference_historical_cases':
                    result = await this.crossReferenceHistoricalCases(investigation);
                    break;
                case 'generate_plagiarism_report':
                    result = await this.generatePlagiarismReport(investigation);
                    break;
                case 'generate_fraud_assessment':
                    result = await this.generateFraudAssessment(investigation);
                    break;
                case 'generate_behavioral_report':
                    result = await this.generateBehavioralReport(investigation);
                    break;
                default:
                    result = { status: 'skipped', reason: 'Unknown step' };
            }

            result.duration = Date.now() - startTime;
            return result;

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                duration: Date.now() - startTime
            };
        }
    }

    /**
     * Evidence collection methods
     */
    async collectSubmissionEvidence(investigation) {
        try {
            const evidence = {
                type: 'submission_evidence',
                collectedAt: new Date().toISOString(),
                data: {}
            };

            // Get submission details
            const submission = await this.getSubmissionDetails(investigation.alertId);
            evidence.data.submission = submission;

            // Get similarity analysis
            const similarityAnalysis = await this.getSimilarityAnalysis(investigation.alertId);
            evidence.data.similarityAnalysis = similarityAnalysis;

            // Get authorship metadata
            const authorshipData = await this.getAuthorshipData(investigation.userId);
            evidence.data.authorship = authorshipData;

            // Store evidence
            investigation.evidence.push(evidence);

            return {
                status: 'success',
                summary: 'Collected submission evidence including content, similarity analysis, and authorship data',
                evidenceCount: 1
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to collect submission evidence'
            };
        }
    }

    async collectUserBehaviorEvidence(investigation) {
        try {
            const evidence = {
                type: 'user_behavior_evidence',
                collectedAt: new Date().toISOString(),
                data: {}
            };

            // Get user activity logs
            const activityLogs = await this.getUserActivityLogs(investigation.userId, 30); // Last 30 days
            evidence.data.activityLogs = activityLogs;

            // Get device fingerprint data
            const deviceData = await this.getDeviceFingerprintData(investigation.userId);
            evidence.data.deviceData = deviceData;

            // Get location data
            const locationData = await this.getLocationData(investigation.userId);
            evidence.data.locationData = locationData;

            // Get session data
            const sessionData = await this.getSessionData(investigation.userId);
            evidence.data.sessionData = sessionData;

            // Store evidence
            investigation.evidence.push(evidence);

            return {
                status: 'success',
                summary: 'Collected user behavior evidence including activity logs, device data, location data, and session data',
                evidenceCount: 1
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to collect user behavior evidence'
            };
        }
    }

    async collectCredentialEvidence(investigation) {
        try {
            const evidence = {
                type: 'credential_evidence',
                collectedAt: new Date().toISOString(),
                data: {}
            };

            // Get credential verification data
            const verificationData = await this.getCredentialVerificationData(investigation.alertId);
            evidence.data.verification = verificationData;

            // Get institution verification
            const institutionData = await this.getInstitutionVerificationData(investigation.alertId);
            evidence.data.institution = institutionData;

            // Get blockchain records
            const blockchainData = await this.getBlockchainRecords(investigation.alertId);
            evidence.data.blockchain = blockchainData;

            // Store evidence
            investigation.evidence.push(evidence);

            return {
                status: 'success',
                summary: 'Collected credential evidence including verification data, institution data, and blockchain records',
                evidenceCount: 1
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to collect credential evidence'
            };
        }
    }

    /**
     * Analysis methods
     */
    async analyzeSimilarityPatterns(investigation) {
        try {
            const submissionEvidence = investigation.evidence.find(e => e.type === 'submission_evidence');
            if (!submissionEvidence) {
                return { status: 'skipped', reason: 'No submission evidence available' };
            }

            const similarityData = submissionEvidence.data.similarityAnalysis;
            const patterns = {
                highSimilarityCount: 0,
                averageSimilarity: 0,
                similarityDistribution: {},
                suspiciousPatterns: []
            };

            // Analyze similarity scores
            const similarities = similarityData.similarities || [];
            patterns.highSimilarityCount = similarities.filter(s => s.similarity > 0.8).length;
            patterns.averageSimilarity = similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;

            // Check for suspicious patterns
            similarities.forEach(sim => {
                if (sim.similarity > 0.95) {
                    patterns.suspiciousPatterns.push({
                        type: 'near_duplicate',
                        submissionId: sim.submissionId,
                        similarity: sim.similarity
                    });
                }
            });

            return {
                status: 'success',
                summary: 'Analyzed similarity patterns and identified suspicious patterns',
                patterns
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to analyze similarity patterns'
            };
        }
    }

    async analyzeActivityPatterns(investigation) {
        try {
            const behaviorEvidence = investigation.evidence.find(e => e.type === 'user_behavior_evidence');
            if (!behaviorEvidence) {
                return { status: 'skipped', reason: 'No behavior evidence available' };
            }

            const activityLogs = behaviorEvidence.data.activityLogs;
            const patterns = {
                loginFrequency: 0,
                activityIrregularity: 0,
                deviceDiversity: 0,
                locationDiversity: 0,
                suspiciousPatterns: []
            };

            // Calculate metrics
            patterns.loginFrequency = activityLogs.filter(log => log.type === 'login').length;
            patterns.deviceDiversity = new Set(activityLogs.map(log => log.deviceId)).size;
            patterns.locationDiversity = new Set(activityLogs.map(log => log.location)).size;

            // Check for suspicious patterns
            const rapidLogins = this.detectRapidLogins(activityLogs);
            if (rapidLogins.length > 0) {
                patterns.suspiciousPatterns.push({
                    type: 'rapid_logins',
                    instances: rapidLogins
                });
            }

            return {
                status: 'success',
                summary: 'Analyzed activity patterns and identified suspicious behaviors',
                patterns
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to analyze activity patterns'
            };
        }
    }

    /**
     * Report generation methods
     */
    async generatePlagiarismReport(investigation) {
        try {
            const report = {
                type: 'plagiarism_report',
                generatedAt: new Date().toISOString(),
                summary: {},
                details: {},
                recommendations: []
            };

            // Analyze all evidence
            const submissionEvidence = investigation.evidence.find(e => e.type === 'submission_evidence');
            const similarityAnalysis = await this.analyzeSimilarityPatterns(investigation);

            // Generate summary
            report.summary = {
                plagiarismDetected: similarityAnalysis.patterns.highSimilarityCount > 0,
                confidence: this.calculatePlagiarismConfidence(similarityAnalysis.patterns),
                severity: this.calculatePlagiarismSeverity(similarityAnalysis.patterns)
            };

            // Generate detailed findings
            report.details = {
                similarityAnalysis: similarityAnalysis.patterns,
                evidenceSummary: this.summarizeEvidence(investigation.evidence)
            };

            // Generate recommendations
            report.recommendations = this.generatePlagiarismRecommendations(report.summary);

            investigation.findings.push(report);

            return {
                status: 'success',
                summary: 'Generated comprehensive plagiarism report',
                report
            };

        } catch (error) {
            return {
                status: 'failed',
                error: error.message,
                summary: 'Failed to generate plagiarism report'
            };
        }
    }

    /**
     * Determine investigation outcome
     */
    async determineOutcome(investigation) {
        try {
            const template = investigation.template;
            const findings = investigation.findings;
            
            // Calculate confidence score
            const confidenceScore = this.calculateInvestigationConfidence(findings);
            
            // Determine if auto-resolution is possible
            const canAutoResolve = confidenceScore >= template.autoResolutionThreshold;
            
            if (canAutoResolve) {
                investigation.autoResolved = true;
                investigation.status = 'auto_resolved';
                investigation.resolution = this.generateAutoResolution(investigation);
            } else {
                investigation.status = 'requires_review';
                investigation.assignedTo = await this.assignInvestigator(investigation);
            }

            // Check for escalation
            if (confidenceScore >= this.config.autoEscalationThreshold) {
                investigation.escalated = true;
                await this.escalateInvestigation(investigation);
            }

        } catch (error) {
            console.error('Error determining investigation outcome:', error);
            investigation.status = 'error';
            investigation.error = error.message;
        }
    }

    /**
     * Finalize investigation
     */
    async finalizeInvestigation(investigation) {
        try {
            investigation.completedAt = new Date().toISOString();
            investigation.updatedAt = new Date().toISOString();

            // Store final investigation
            await this.storeInvestigation(investigation);

            // Remove from active investigations
            this.activeInvestigations.delete(investigation.id);

            // Send notifications
            await this.sendInvestigationNotifications(investigation);

            // Emit completion event
            this.emit('investigation_completed', investigation);

            console.log(`Investigation finalized: ${investigation.id} - Status: ${investigation.status}`);

        } catch (error) {
            console.error('Error finalizing investigation:', error);
        }
    }

    /**
     * Helper methods
     */
    calculateInvestigationPriority(alert) {
        const priorityMap = {
            'critical': 1,
            'high': 2,
            'medium': 3,
            'low': 4
        };
        
        return priorityMap[alert.severity] || 3;
    }

    calculatePlagiarismConfidence(patterns) {
        let confidence = 0;
        
        if (patterns.highSimilarityCount > 0) {
            confidence += 0.4;
        }
        
        if (patterns.suspiciousPatterns.length > 0) {
            confidence += 0.3;
        }
        
        if (patterns.averageSimilarity > 0.8) {
            confidence += 0.3;
        }
        
        return Math.min(1, confidence);
    }

    calculatePlagiarismSeverity(patterns) {
        if (patterns.highSimilarityCount > 5) return 'critical';
        if (patterns.highSimilarityCount > 2) return 'high';
        if (patterns.highSimilarityCount > 0) return 'medium';
        return 'low';
    }

    calculateInvestigationConfidence(findings) {
        if (findings.length === 0) return 0;
        
        const confidenceScores = findings.map(f => {
            if (f.type === 'plagiarism_report') {
                return f.summary.confidence || 0;
            }
            return 0.5; // Default confidence for other findings
        });
        
        return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    }

    generateAutoResolution(investigation) {
        const template = investigation.template;
        const findings = investigation.findings;
        
        if (findings.length === 0) {
            return {
                action: 'insufficient_evidence',
                reason: 'Not enough evidence to make determination'
            };
        }
        
        // Generate resolution based on findings
        const primaryFinding = findings[0];
        
        if (primaryFinding.type === 'plagiarism_report') {
            if (primaryFinding.summary.plagiarismDetected) {
                return {
                    action: 'confirm_plagiarism',
                    reason: 'Strong evidence of plagiarism detected',
                    recommendations: primaryFinding.recommendations
                };
            } else {
                return {
                    action: 'dismiss_plagiarism',
                    reason: 'Insufficient evidence of plagiarism',
                    recommendations: primaryFinding.recommendations
                };
            }
        }
        
        return {
            action: 'manual_review',
            reason: 'Complex case requiring human judgment'
        };
    }

    detectRapidLogins(activityLogs) {
        const logins = activityLogs.filter(log => log.type === 'login');
        const rapidLogins = [];
        
        for (let i = 1; i < logins.length; i++) {
            const timeDiff = new Date(logins[i].timestamp) - new Date(logins[i-1].timestamp);
            if (timeDiff < 5 * 60 * 1000) { // Less than 5 minutes
                rapidLogins.push({
                    login1: logins[i-1],
                    login2: logins[i],
                    timeDiff
                });
            }
        }
        
        return rapidLogins;
    }

    summarizeEvidence(evidence) {
        return {
            totalEvidence: evidence.length,
            evidenceTypes: evidence.map(e => e.type),
            collectionTimeRange: {
                earliest: Math.min(...evidence.map(e => new Date(e.collectedAt).getTime())),
                latest: Math.max(...evidence.map(e => new Date(e.collectedAt).getTime()))
            }
        };
    }

    generatePlagiarismRecommendations(summary) {
        const recommendations = [];
        
        if (summary.plagiarismDetected) {
            recommendations.push({
                action: 'academic_discipline',
                priority: 'high',
                description: 'Initiate academic discipline process'
            });
            
            recommendations.push({
                action: 'educational_intervention',
                priority: 'medium',
                description: 'Provide academic integrity education'
            });
        } else {
            recommendations.push({
                action: 'clear_record',
                priority: 'low',
                description: 'Clear student record of plagiarism allegation'
            });
        }
        
        return recommendations;
    }

    // Placeholder methods for data retrieval
    async getSubmissionDetails(alertId) { return {}; }
    async getSimilarityAnalysis(alertId) { return { similarities: [] }; }
    async getAuthorshipData(userId) { return {}; }
    async getUserActivityLogs(userId, days) { return []; }
    async getDeviceFingerprintData(userId) { return {}; }
    async getLocationData(userId) { return {}; }
    async getSessionData(userId) { return {}; }
    async getCredentialVerificationData(alertId) { return {}; }
    async getInstitutionVerificationData(alertId) { return {}; }
    async getBlockchainRecords(alertId) { return {}; }
    async checkAuthorshipPatterns(investigation) { return { status: 'success', patterns: [] }; }
    async verifySourceIntegrity(investigation) { return { status: 'success', integrity: 'verified' }; }
    async verifyInstitutionAuthenticity(investigation) { return { status: 'success', authentic: true }; }
    async analyzeIssuancePatterns(investigation) { return { status: 'success', patterns: [] }; }
    async checkDeviceFingerprints(investigation) { return { status: 'success', fingerprints: [] }; }
    async crossReferenceHistoricalCases(investigation) { return { status: 'success', cases: [] }; }
    async generateFraudAssessment(investigation) { return { status: 'success', assessment: {} }; }
    async generateBehavioralReport(investigation) { return { status: 'success', report: {} }; }
    async assignInvestigator(investigation) { return 'auto_assigned'; }
    async escalateInvestigation(investigation) { /* Escalate investigation */ }
    async sendInvestigationNotifications(investigation) { /* Send notifications */ }
    async storeInvestigation(investigation) { /* Store in database */ }

    // Public API methods
    async getInvestigationStatistics(timeRange = '24h') {
        try {
            const stats = {
                timeRange,
                totalInvestigations: 0,
                activeInvestigations: this.activeInvestigations.size,
                queuedInvestigations: this.investigationQueue.length,
                autoResolved: 0,
                escalated: 0,
                averageResolutionTime: 0,
                investigationsByType: {},
                investigationsByStatus: {}
            };

            // Get statistics from database
            const investigations = await this.getInvestigationsFromDatabase(timeRange);
            stats.totalInvestigations = investigations.length;

            investigations.forEach(inv => {
                stats.investigationsByType[inv.type] = (stats.investigationsByType[inv.type] || 0) + 1;
                stats.investigationsByStatus[inv.status] = (stats.investigationsByStatus[inv.status] || 0) + 1;
                
                if (inv.autoResolved) stats.autoResolved++;
                if (inv.escalated) stats.escalated++;
            });

            return stats;

        } catch (error) {
            console.error('Error getting investigation statistics:', error);
            throw error;
        }
    }

    async getInvestigationsFromDatabase(timeRange) {
        // Retrieve investigations from database
        return [];
    }

    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: this.redisClient ? 'connected' : 'disconnected'
            },
            metrics: {
                activeInvestigations: this.activeInvestigations.size,
                queuedInvestigations: this.investigationQueue.length,
                templatesLoaded: this.investigationTemplates.size,
                evidenceCollectors: this.evidenceCollectors.size
            }
        };

        return health;
    }
}

module.exports = new AutomatedInvestigationService();
