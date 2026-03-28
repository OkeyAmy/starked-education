/**
 * Credential Fraud Detection Service
 * Detects fraudulent certificates, credentials, and verification attempts
 */

const crypto = require('crypto');
const { 
    IsolationForest, 
    LocalOutlierFactor, 
    OneClassSVM 
} = require('scikit-learn');
const { 
    JaroWinklerDistance, 
    LevenshteinDistance 
} = require('natural');
const axios = require('axios');
const redis = require('redis');
const EventEmitter = require('events');

class CredentialFraudDetector extends EventEmitter {
    constructor() {
        super();
        
        this.config = {
            redisHost: process.env.REDIS_HOST || 'localhost',
            redisPort: process.env.REDIS_PORT || 6379,
            redisPassword: process.env.REDIS_PASSWORD,
            anomalyThreshold: 0.7,
            verificationTimeout: 30000, // 30 seconds
            maxRetries: 3,
            externalVerificationServices: [
                'blockchain_verify',
                'institution_api',
                'third_party_validator'
            ],
            riskFactors: {
                multipleInstitutions: 0.3,
                rapidIssuance: 0.4,
                inconsistentPatterns: 0.5,
                suspiciousMetadata: 0.6
            }
        };
        
        // Initialize connections
        this.redisClient = null;
        
        // ML models
        this.verificationModel = null;
        this.patternModel = null;
        
        // Data stores
        this.verificationHistory = new Map();
        this.institutionDatabase = new Map();
        this.blockchainVerifier = null;
        
        // Initialize services
        this.initializeConnections();
        this.initializeModels();
        this.loadInstitutionData();
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
                db: 9 // Separate DB for credential fraud detection
            });
            
            await this.redisClient.connect();
            console.log('Credential Fraud Detector: Redis connected');
            
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
            // Verification pattern analysis model
            this.verificationModel = new IsolationForest({
                n_estimators: 100,
                contamination: 0.1,
                randomState: 42
            });
            
            // Credential pattern analysis model
            this.patternModel = new LocalOutlierFactor({
                n_neighbors: 20,
                contamination: 0.1
            });
            
            console.log('Credential Fraud Detector: ML models initialized');
            
        } catch (error) {
            console.error('Failed to initialize ML models:', error);
        }
    }

    /**
     * Load institution data for verification
     */
    async loadInstitutionData() {
        try {
            // Load accredited institutions database
            const institutions = await this.loadInstitutionsFromDatabase();
            institutions.forEach(inst => {
                this.institutionDatabase.set(inst.id, inst);
            });
            
            console.log(`Loaded ${institutions.length} institutions for verification`);
            
        } catch (error) {
            console.error('Failed to load institution data:', error);
        }
    }

    /**
     * Main credential verification method
     */
    async verifyCredential(credential) {
        const {
            credentialId,
            userId,
            credentialType, // 'certificate', 'degree', 'diploma', 'license'
            institutionId,
            issueDate,
            expirationDate,
            credentialData,
            verificationCode,
            metadata = {}
        } = credential;

        try {
            console.log(`Starting credential verification for ${credentialId}`);
            
            // Check cache first
            const cacheKey = `credential_verify:${credentialId}`;
            const cachedResult = await this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // Perform multi-layered verification
            const verificationResults = await Promise.all([
                this.performBasicValidation(credential),
                this.performInstitutionVerification(credential),
                this.performBlockchainVerification(credential),
                this.performPatternAnalysis(credential),
                this.performBehavioralAnalysis(credential)
            ]);

            // Combine verification results
            const combinedResult = this.combineVerificationResults(
                verificationResults,
                credential
            );

            // Generate fraud risk assessment
            const riskAssessment = await this.assessFraudRisk(
                credential,
                combinedResult
            );

            // Create verification report
            const verificationReport = {
                credentialId,
                userId,
                credentialType,
                timestamp: new Date().toISOString(),
                verificationResults: combinedResult,
                riskAssessment,
                isValid: combinedResult.overallScore > 0.7 && riskAssessment.riskLevel !== 'high',
                recommendations: this.generateVerificationRecommendations(
                    combinedResult,
                    riskAssessment
                )
            };

            // Cache results
            await this.setCache(cacheKey, verificationReport);

            // Store verification history
            await this.storeVerificationHistory(credentialId, verificationReport);

            // Emit verification event
            this.emit('credential_verified', verificationReport);

            console.log(`Credential verification completed for ${credentialId}`);
            return verificationReport;

        } catch (error) {
            console.error('Error in credential verification:', error);
            throw new Error(`Credential verification failed: ${error.message}`);
        }
    }

    /**
     * Perform basic validation of credential data
     */
    async performBasicValidation(credential) {
        const result = {
            method: 'basic_validation',
            score: 0,
            details: {},
            issues: []
        };

        try {
            // Validate required fields
            const requiredFields = ['credentialId', 'institutionId', 'issueDate'];
            for (const field of requiredFields) {
                if (!credential[field]) {
                    result.issues.push(`Missing required field: ${field}`);
                }
            }

            // Validate date formats and logic
            const issueDate = new Date(credential.issueDate);
            const expirationDate = credential.expirationDate ? new Date(credential.expirationDate) : null;
            const now = new Date();

            if (isNaN(issueDate.getTime())) {
                result.issues.push('Invalid issue date format');
            } else if (issueDate > now) {
                result.issues.push('Issue date is in the future');
                result.details.futureIssue = true;
            }

            if (expirationDate) {
                if (isNaN(expirationDate.getTime())) {
                    result.issues.push('Invalid expiration date format');
                } else if (expirationDate < issueDate) {
                    result.issues.push('Expiration date before issue date');
                    result.details.invalidDateRange = true;
                }
            }

            // Validate credential ID format
            if (!this.isValidCredentialId(credential.credentialId)) {
                result.issues.push('Invalid credential ID format');
                result.details.invalidFormat = true;
            }

            // Calculate basic validation score
            result.score = Math.max(0, 1 - (result.issues.length * 0.2));

        } catch (error) {
            result.issues.push(`Basic validation error: ${error.message}`);
            result.score = 0;
        }

        return result;
    }

    /**
     * Perform institution verification
     */
    async performInstitutionVerification(credential) {
        const result = {
            method: 'institution_verification',
            score: 0,
            details: {},
            issues: []
        };

        try {
            const institution = this.institutionDatabase.get(credential.institutionId);
            
            if (!institution) {
                result.issues.push('Unknown institution');
                result.details.unknownInstitution = true;
                result.score = 0;
                return result;
            }

            // Verify institution is accredited
            if (!institution.accredited) {
                result.issues.push('Institution not accredited');
                result.details.notAccredited = true;
            }

            // Verify institution offers this credential type
            if (!institution.offeredCredentials.includes(credential.credentialType)) {
                result.issues.push('Institution does not offer this credential type');
                result.details.invalidCredentialType = true;
            }

            // Verify against institution's verification API if available
            if (institution.verificationApi) {
                const apiResult = await this.verifyWithInstitutionAPI(
                    credential,
                    institution.verificationApi
                );
                
                result.details.apiVerification = apiResult;
                if (!apiResult.valid) {
                    result.issues.push('Institution API verification failed');
                }
            }

            // Calculate institution verification score
            result.score = Math.max(0, 1 - (result.issues.length * 0.25));
            result.details.institution = {
                name: institution.name,
                accredited: institution.accredited,
                location: institution.location
            };

        } catch (error) {
            result.issues.push(`Institution verification error: ${error.message}`);
            result.score = 0;
        }

        return result;
    }

    /**
     * Perform blockchain verification
     */
    async performBlockchainVerification(credential) {
        const result = {
            method: 'blockchain_verification',
            score: 0,
            details: {},
            issues: []
        };

        try {
            // Check if credential has blockchain record
            const blockchainRecord = await this.queryBlockchain(credential.credentialId);
            
            if (!blockchainRecord) {
                result.issues.push('No blockchain record found');
                result.details.noBlockchainRecord = true;
                result.score = 0.5; // Neutral score for missing blockchain
                return result;
            }

            // Verify blockchain record matches credential
            const matches = this.compareBlockchainRecord(blockchainRecord, credential);
            
            if (!matches.valid) {
                result.issues.push('Blockchain record does not match credential');
                result.details.blockchainMismatch = matches.differences;
            }

            // Verify blockchain integrity
            const integrityCheck = await this.verifyBlockchainIntegrity(blockchainRecord);
            
            if (!integrityCheck.valid) {
                result.issues.push('Blockchain integrity check failed');
                result.details.integrityIssues = integrityCheck.issues;
            }

            // Calculate blockchain verification score
            result.score = matches.valid && integrityCheck.valid ? 1 : 0.3;
            result.details.blockchain = {
                hash: blockchainRecord.hash,
                timestamp: blockchainRecord.timestamp,
                transactions: blockchainRecord.transactions
            };

        } catch (error) {
            result.issues.push(`Blockchain verification error: ${error.message}`);
            result.score = 0;
        }

        return result;
    }

    /**
     * Perform pattern analysis on credential data
     */
    async performPatternAnalysis(credential) {
        const result = {
            method: 'pattern_analysis',
            score: 0,
            details: {},
            issues: []
        };

        try {
            // Get user's credential history
            const userHistory = await this.getUserCredentialHistory(credential.userId);
            
            // Extract features for pattern analysis
            const features = this.extractCredentialFeatures(credential, userHistory);
            
            // Detect anomalies using ML model
            const anomalyScore = this.patternModel.decision_function([features])[0];
            const isAnomalous = anomalyScore < this.config.anomalyThreshold;
            
            if (isAnomalous) {
                result.issues.push('Suspicious credential pattern detected');
                result.details.anomalyScore = anomalyScore;
                result.details.features = features;
            }

            // Check for specific fraud patterns
            const fraudPatterns = this.detectFraudPatterns(credential, userHistory);
            
            if (fraudPatterns.length > 0) {
                result.issues.push(...fraudPatterns.map(p => p.description));
                result.details.fraudPatterns = fraudPatterns;
            }

            // Calculate pattern analysis score
            result.score = isAnomalous ? 0.2 : 0.8;
            if (fraudPatterns.length > 0) {
                result.score -= fraudPatterns.length * 0.1;
            }

        } catch (error) {
            result.issues.push(`Pattern analysis error: ${error.message}`);
            result.score = 0;
        }

        return result;
    }

    /**
     * Perform behavioral analysis on verification attempts
     */
    async performBehavioralAnalysis(credential) {
        const result = {
            method: 'behavioral_analysis',
            score: 0,
            details: {},
            issues: []
        };

        try {
            // Get verification attempt history
            const verificationHistory = await this.getVerificationHistory(credential.userId);
            
            // Analyze verification patterns
            const patterns = this.analyzeVerificationPatterns(verificationHistory);
            
            // Check for suspicious behaviors
            const suspiciousBehaviors = this.detectSuspiciousBehaviors(patterns);
            
            if (suspiciousBehaviors.length > 0) {
                result.issues.push(...suspiciousBehaviors.map(b => b.description));
                result.details.suspiciousBehaviors = suspiciousBehaviors;
            }

            // Check verification velocity
            const velocityCheck = this.checkVerificationVelocity(verificationHistory);
            
            if (velocityCheck.suspicious) {
                result.issues.push('High verification velocity detected');
                result.details.velocityCheck = velocityCheck;
            }

            // Calculate behavioral analysis score
            result.score = suspiciousBehaviors.length === 0 && !velocityCheck.suspicious ? 0.9 : 0.3;
            result.details.patterns = patterns;

        } catch (error) {
            result.issues.push(`Behavioral analysis error: ${error.message}`);
            result.score = 0;
        }

        return result;
    }

    /**
     * Combine verification results from different methods
     */
    combineVerificationResults(verificationResults, credential) {
        const combined = {
            overallScore: 0,
            methodResults: verificationResults,
            issues: [],
            riskFactors: [],
            confidence: 0
        };

        // Weight different verification methods
        const weights = {
            basic_validation: 0.2,
            institution_verification: 0.3,
            blockchain_verification: 0.3,
            pattern_analysis: 0.1,
            behavioral_analysis: 0.1
        };

        // Calculate weighted score
        let weightedScore = 0;
        for (const result of verificationResults) {
            const weight = weights[result.method] || 0.2;
            weightedScore += result.score * weight;
            
            // Collect all issues
            combined.issues.push(...result.issues);
            
            // Collect risk factors
            if (result.details.riskFactors) {
                combined.riskFactors.push(...result.details.riskFactors);
            }
        }

        combined.overallScore = weightedScore;

        // Calculate confidence based on method agreement
        const validMethods = verificationResults.filter(r => r.score > 0.7).length;
        combined.confidence = validMethods / verificationResults.length;

        return combined;
    }

    /**
     * Assess fraud risk based on verification results
     */
    async assessFraudRisk(credential, verificationResult) {
        const riskAssessment = {
            riskLevel: 'low',
            riskScore: 0,
            riskFactors: [],
            recommendations: []
        };

        try {
            // Calculate base risk score
            let riskScore = 1 - verificationResult.overallScore;

            // Add risk factors
            if (verificationResult.issues.length > 0) {
                riskScore += verificationResult.issues.length * 0.1;
                riskAssessment.riskFactors.push({
                    type: 'verification_issues',
                    count: verificationResult.issues.length
                });
            }

            // Check for specific risk indicators
            const riskIndicators = this.identifyRiskIndicators(credential, verificationResult);
            riskAssessment.riskFactors.push(...riskIndicators);
            riskScore += riskIndicators.length * 0.15;

            // Normalize risk score
            riskScore = Math.min(1, Math.max(0, riskScore));
            riskAssessment.riskScore = riskScore;

            // Determine risk level
            if (riskScore > 0.8) {
                riskAssessment.riskLevel = 'critical';
            } else if (riskScore > 0.6) {
                riskAssessment.riskLevel = 'high';
            } else if (riskScore > 0.4) {
                riskAssessment.riskLevel = 'medium';
            } else if (riskScore > 0.2) {
                riskAssessment.riskLevel = 'low';
            } else {
                riskAssessment.riskLevel = 'minimal';
            }

            // Generate recommendations
            riskAssessment.recommendations = this.generateRiskRecommendations(
                riskAssessment,
                verificationResult
            );

        } catch (error) {
            console.error('Error in fraud risk assessment:', error);
            riskAssessment.riskLevel = 'unknown';
            riskAssessment.riskScore = 0.5;
        }

        return riskAssessment;
    }

    /**
     * Identify specific risk indicators
     */
    identifyRiskIndicators(credential, verificationResult) {
        const indicators = [];

        // Check for rapid credential issuance
        const userHistory = this.verificationHistory.get(credential.userId) || [];
        const recentCredentials = userHistory.filter(
            h => new Date(h.timestamp) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );

        if (recentCredentials.length > 5) {
            indicators.push({
                type: 'rapid_issuance',
                description: 'Multiple credentials obtained in short period',
                severity: 'medium'
            });
        }

        // Check for multiple institutions
        const institutions = new Set(userHistory.map(h => h.institutionId));
        if (institutions.size > 3) {
            indicators.push({
                type: 'multiple_institutions',
                description: 'Credentials from unusually high number of institutions',
                severity: 'low'
            });
        }

        // Check for inconsistent patterns
        const patterns = verificationResult.methodResults.find(r => r.method === 'pattern_analysis');
        if (patterns && patterns.details.fraudPatterns) {
            indicators.push(...patterns.details.fraudPatterns.map(p => ({
                type: 'inconsistent_pattern',
                description: p.description,
                severity: p.severity || 'medium'
            })));
        }

        return indicators;
    }

    /**
     * Generate verification recommendations
     */
    generateVerificationRecommendations(verificationResult, riskAssessment) {
        const recommendations = [];

        if (riskAssessment.riskLevel === 'critical') {
            recommendations.push({
                type: 'immediate_action',
                priority: 'critical',
                description: 'High fraud risk - immediate manual verification required',
                action: 'manual_verification'
            });
        } else if (riskAssessment.riskLevel === 'high') {
            recommendations.push({
                type: 'enhanced_verification',
                priority: 'high',
                description: 'Additional verification steps recommended',
                action: 'enhanced_verification'
            });
        }

        if (verificationResult.confidence < 0.7) {
            recommendations.push({
                type: 'confidence_check',
                priority: 'medium',
                description: 'Low verification confidence - cross-check recommended',
                action: 'cross_check'
            });
        }

        // Method-specific recommendations
        const blockchainResult = verificationResult.methodResults.find(r => r.method === 'blockchain_verification');
        if (blockchainResult && blockchainResult.details.noBlockchainRecord) {
            recommendations.push({
                type: 'blockchain_enrollment',
                priority: 'low',
                description: 'Consider enrolling credential in blockchain system',
                action: 'blockchain_enrollment'
            });
        }

        return recommendations;
    }

    /**
     * Generate risk mitigation recommendations
     */
    generateRiskRecommendations(riskAssessment, verificationResult) {
        const recommendations = [];

        switch (riskAssessment.riskLevel) {
            case 'critical':
                recommendations.push({
                    action: 'suspend_credential',
                    description: 'Suspend credential until manual verification',
                    priority: 'critical'
                });
                recommendations.push({
                    action: 'investigate_user',
                    description: 'Initiate fraud investigation for user',
                    priority: 'critical'
                });
                break;
            case 'high':
                recommendations.push({
                    action: 'flag_for_review',
                    description: 'Flag credential for administrative review',
                    priority: 'high'
                });
                recommendations.push({
                    action: 'enhanced_monitoring',
                    description: 'Implement enhanced monitoring for user',
                    priority: 'medium'
                });
                break;
            case 'medium':
                recommendations.push({
                    action: 'additional_verification',
                    description: 'Request additional verification documents',
                    priority: 'medium'
                });
                break;
        }

        return recommendations;
    }

    /**
     * Helper methods
     */
    isValidCredentialId(credentialId) {
        // Implement credential ID format validation
        const idPattern = /^[A-Z0-9]{8,20}$/;
        return idPattern.test(credentialId);
    }

    compareBlockchainRecord(blockchainRecord, credential) {
        const differences = [];
        
        if (blockchainRecord.institutionId !== credential.institutionId) {
            differences.push('Institution ID mismatch');
        }
        
        if (blockchainRecord.credentialType !== credential.credentialType) {
            differences.push('Credential type mismatch');
        }
        
        if (new Date(blockchainRecord.issueDate).getTime() !== new Date(credential.issueDate).getTime()) {
            differences.push('Issue date mismatch');
        }
        
        return {
            valid: differences.length === 0,
            differences
        };
    }

    async verifyBlockchainIntegrity(blockchainRecord) {
        // Implement blockchain integrity verification
        return {
            valid: true,
            issues: []
        };
    }

    extractCredentialFeatures(credential, userHistory) {
        const features = [];
        
        // Time-based features
        const issueDate = new Date(credential.issueDate);
        features.push(issueDate.getTime());
        features.push(issueDate.getFullYear());
        
        // User history features
        features.push(userHistory.length);
        features.push(userHistory.filter(h => h.institutionId === credential.institutionId).length);
        
        // Credential features
        features.push(credential.credentialType.length);
        features.push(credential.institutionId.length);
        
        return features;
    }

    detectFraudPatterns(credential, userHistory) {
        const patterns = [];
        
        // Check for sequential credential IDs
        const recentIds = userHistory.slice(-5).map(h => h.credentialId);
        if (this.areSequentialIds(recentIds, credential.credentialId)) {
            patterns.push({
                type: 'sequential_ids',
                description: 'Sequential credential IDs detected',
                severity: 'high'
            });
        }
        
        // Check for template-based credentials
        if (this.isTemplateBased(credential.credentialId)) {
            patterns.push({
                type: 'template_based',
                description: 'Template-based credential ID detected',
                severity: 'medium'
            });
        }
        
        return patterns;
    }

    areSequentialIds(ids, newId) {
        // Implement sequential ID detection logic
        return false; // Simplified
    }

    isTemplateBased(credentialId) {
        // Check if credential ID follows suspicious template patterns
        const templatePatterns = [
            /^[A-Z]+-\d{4}-[A-Z]+$/,
            /^\d{8}-[A-Z]{4}$/,
            /^[A-Z]\d{6}[A-Z]$/
        ];
        
        return templatePatterns.some(pattern => pattern.test(credentialId));
    }

    // Cache management
    async getFromCache(key) {
        try {
            const cached = await this.redisClient.get(key);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            return null;
        }
    }

    async setCache(key, value, timeout = 3600) {
        try {
            await this.redisClient.setEx(key, timeout, JSON.stringify(value));
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }

    // Placeholder methods for database operations
    async loadInstitutionsFromDatabase() {
        return [
            {
                id: 'inst_001',
                name: 'Example University',
                accredited: true,
                location: 'US',
                offeredCredentials: ['degree', 'certificate'],
                verificationApi: 'https://api.example-university.edu/verify'
            }
        ];
    }

    async verifyWithInstitutionAPI(credential, apiUrl) {
        try {
            const response = await axios.post(apiUrl, {
                credentialId: credential.credentialId,
                userId: credential.userId
            }, {
                timeout: this.config.verificationTimeout
            });
            
            return response.data;
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    async queryBlockchain(credentialId) {
        // Query blockchain for credential record
        return null; // Placeholder
    }

    async getUserCredentialHistory(userId) {
        // Get user's credential verification history
        return this.verificationHistory.get(userId) || [];
    }

    async getVerificationHistory(userId) {
        // Get verification attempt history
        return [];
    }

    async analyzeVerificationPatterns(history) {
        // Analyze patterns in verification attempts
        return {
            frequency: history.length,
            timeDistribution: [],
            successRate: 0.8
        };
    }

    async detectSuspiciousBehaviors(patterns) {
        // Detect suspicious verification behaviors
        return [];
    }

    async checkVerificationVelocity(history) {
        // Check for high velocity verification attempts
        return {
            suspicious: false,
            attempts: history.length,
            timeWindow: '24h'
        };
    }

    async storeVerificationHistory(credentialId, report) {
        // Store verification history in database
        console.log(`Stored verification history for ${credentialId}`);
    }

    async getFraudStatistics(timeRange = '24h') {
        // Get fraud detection statistics
        return {
            timeRange,
            totalVerifications: 0,
            fraudDetected: 0,
            riskDistribution: {},
            topRiskFactors: []
        };
    }

    async healthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                redis: this.redisClient ? 'connected' : 'disconnected'
            },
            models: {
                verification: this.verificationModel ? 'loaded' : 'not loaded',
                pattern: this.patternModel ? 'loaded' : 'not loaded'
            },
            metrics: {
                institutionsLoaded: this.institutionDatabase.size,
                verificationHistory: this.verificationHistory.size
            }
        };
    }
}

module.exports = new CredentialFraudDetector();
