/**
 * Quantum Threat Monitoring and Alert System
 * Monitors for quantum computing threats and provides security alerts
 */

const crypto = require('crypto');
const EventEmitter = require('events');
const QuantumKeyManagement = require('./quantumKeyManagement');
const HybridEncryption = require('./hybridEncryption');

class QuantumThreatMonitoringService extends EventEmitter {
    constructor() {
        super();
        this.keyManagement = QuantumKeyManagement;
        this.hybridEncryption = HybridEncryption;
        
        this.threatLevels = {
            LOW: 1,
            MEDIUM: 2,
            HIGH: 3,
            CRITICAL: 4
        };
        
        this.threatTypes = {
            QUANTUM_COMPUTING_ADVANCEMENT: 'quantum_computing_advancement',
            VULNERABLE_ALGORITHM_DETECTED: 'vulnerable_algorithm_detected',
            KEY_COMPROMISE_SUSPECTED: 'key_compromise_suspected',
            QUANTUM_ATTACK_DETECTED: 'quantum_attack_detected',
            OUTDATED_CRYPTOGRAPHY: 'outdated_cryptography',
            QUANTUM_SUPREMACY_MILESTONE: 'quantum_supremacy_milestone'
        };
        
        this.monitoringConfig = {
            scanInterval: 60 * 60 * 1000, // 1 hour
            alertThresholds: {
                keyAge: 180, // days
                algorithmStrength: 'medium',
                quantumAdvancementRate: 0.1
            },
            externalFeeds: [
                'https://api.nist.gov/pqc-drafts',
                'https://quantum-computing.ibm.com/api/status',
                'https://arxiv.org/search/?query=quantum+computing+breakthrough'
            ]
        };
        
        this.threatHistory = [];
        this.activeAlerts = new Map();
        this.isMonitoring = false;
        
        this.initializeMonitoring();
    }

    /**
     * Initialize threat monitoring system
     */
    async initializeMonitoring() {
        try {
            console.log('Initializing Quantum Threat Monitoring System...');
            
            // Start periodic scanning
            this.startMonitoring();
            
            // Set up event listeners
            this.setupEventListeners();
            
            console.log('Quantum Threat Monitoring System initialized');
            
        } catch (error) {
            console.error('Failed to initialize threat monitoring:', error);
            this.emit('error', { type: 'initialization_failed', error: error.message });
        }
    }

    /**
     * Start continuous monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.log('Threat monitoring already active');
            return;
        }
        
        this.isMonitoring = true;
        this.monitoringInterval = setInterval(async () => {
            await this.performThreatScan();
        }, this.monitoringConfig.scanInterval);
        
        console.log('Quantum threat monitoring started');
        this.emit('monitoring_started', { timestamp: new Date().toISOString() });
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) {
            return;
        }
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('Quantum threat monitoring stopped');
        this.emit('monitoring_stopped', { timestamp: new Date().toISOString() });
    }

    /**
     * Perform comprehensive threat scan
     */
    async performThreatScan() {
        const scanId = crypto.randomUUID();
        const scanStartTime = Date.now();
        
        try {
            console.log(`Starting threat scan: ${scanId}`);
            
            const scanResults = {
                scanId,
                timestamp: new Date().toISOString(),
                threats: [],
                vulnerabilities: [],
                recommendations: [],
                securityScore: 100
            };
            
            // Scan for various threat types
            await Promise.all([
                this.scanForVulnerableAlgorithms(scanResults),
                this.scanForOutdatedKeys(scanResults),
                this.scanForQuantumAdvancements(scanResults),
                this.scanForAnomalousActivity(scanResults),
                this.checkExternalThreatFeeds(scanResults)
            ]);
            
            // Calculate overall security score
            scanResults.securityScore = this.calculateSecurityScore(scanResults);
            
            // Process scan results
            await this.processScanResults(scanResults);
            
            const scanDuration = Date.now() - scanStartTime;
            scanResults.duration = scanDuration;
            
            console.log(`Threat scan completed: ${scanId} (${scanDuration}ms)`);
            this.emit('scan_completed', scanResults);
            
            return scanResults;
            
        } catch (error) {
            console.error(`Threat scan failed: ${scanId}`, error);
            this.emit('scan_failed', { scanId, error: error.message });
            throw error;
        }
    }

    /**
     * Scan for vulnerable cryptographic algorithms
     */
    async scanForVulnerableAlgorithms(scanResults) {
        try {
            const keys = await this.keyManagement.listActiveKeys();
            const vulnerableKeys = [];
            
            for (const key of keys) {
                const vulnerability = await this.assessAlgorithmVulnerability(key);
                if (vulnerability.isVulnerable) {
                    vulnerableKeys.push({
                        keyId: key.keyId,
                        algorithm: key.algorithm,
                        vulnerability: vulnerability,
                        recommendation: this.getVulnerabilityRecommendation(vulnerability)
                    });
                }
            }
            
            if (vulnerableKeys.length > 0) {
                scanResults.threats.push({
                    type: this.threatTypes.VULNERABLE_ALGORITHM_DETECTED,
                    level: this.threatLevels.HIGH,
                    description: `Found ${vulnerableKeys.length} keys with vulnerable algorithms`,
                    affectedKeys: vulnerableKeys,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Algorithm vulnerability scan failed:', error);
        }
    }

    /**
     * Scan for outdated cryptographic keys
     */
    async scanForOutdatedKeys(scanResults) {
        try {
            const keys = await this.keyManagement.listActiveKeys();
            const outdatedKeys = [];
            
            for (const key of keys) {
                const keyAge = this.calculateKeyAge(key.createdAt);
                if (keyAge > this.monitoringConfig.alertThresholds.keyAge) {
                    outdatedKeys.push({
                        keyId: key.keyId,
                        algorithm: key.algorithm,
                        age: keyAge,
                        lastRotated: key.lastRotated
                    });
                }
            }
            
            if (outdatedKeys.length > 0) {
                scanResults.threats.push({
                    type: this.threatTypes.OUTDATED_CRYPTOGRAPHY,
                    level: this.threatLevels.MEDIUM,
                    description: `Found ${outdatedKeys.length} outdated keys requiring rotation`,
                    outdatedKeys: outdatedKeys,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Outdated keys scan failed:', error);
        }
    }

    /**
     * Scan for quantum computing advancements
     */
    async scanForQuantumAdvancements(scanResults) {
        try {
            // Simulate checking external sources for quantum computing breakthroughs
            const advancements = await this.checkQuantumAdvancementFeeds();
            
            if (advancements.length > 0) {
                const criticalAdvancements = advancements.filter(a => a.impact === 'critical');
                const threatLevel = criticalAdvancements.length > 0 ? 
                    this.threatLevels.CRITICAL : this.threatLevels.HIGH;
                
                scanResults.threats.push({
                    type: this.threatTypes.QUANTUM_COMPUTING_ADVANCEMENT,
                    level: threatLevel,
                    description: `Detected ${advancements.length} quantum computing advancements`,
                    advancements: advancements,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Quantum advancement scan failed:', error);
        }
    }

    /**
     * Scan for anomalous cryptographic activity
     */
    async scanForAnomalousActivity(scanResults) {
        try {
            // Monitor for unusual patterns in encryption/decryption operations
            const anomalies = await this.detectCryptographicAnomalies();
            
            if (anomalies.length > 0) {
                scanResults.threats.push({
                    type: this.threatTypes.QUANTUM_ATTACK_DETECTED,
                    level: this.threatLevels.CRITICAL,
                    description: `Detected ${anomalies.length} anomalous cryptographic activities`,
                    anomalies: anomalies,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('Anomalous activity scan failed:', error);
        }
    }

    /**
     * Check external threat feeds
     */
    async checkExternalThreatFeeds(scanResults) {
        try {
            const externalThreats = [];
            
            for (const feed of this.monitoringConfig.externalFeeds) {
                try {
                    const threats = await this.fetchThreatFeed(feed);
                    externalThreats.push(...threats);
                } catch (error) {
                    console.warn(`Failed to fetch threat feed ${feed}:`, error.message);
                }
            }
            
            if (externalThreats.length > 0) {
                scanResults.threats.push({
                    type: 'external_threat_intelligence',
                    level: this.threatLevels.MEDIUM,
                    description: `Received ${externalThreats.length} threats from external feeds`,
                    externalThreats: externalThreats,
                    timestamp: new Date().toISOString()
                });
            }
            
        } catch (error) {
            console.error('External threat feed check failed:', error);
        }
    }

    /**
     * Create security alert
     */
    async createAlert(threat, options = {}) {
        const alertId = crypto.randomUUID();
        const alert = {
            id: alertId,
            threat: threat,
            level: threat.level,
            title: this.generateAlertTitle(threat),
            description: threat.description,
            recommendations: this.generateAlertRecommendations(threat),
            timestamp: new Date().toISOString(),
            status: 'active',
            acknowledged: false,
            ...options
        };
        
        this.activeAlerts.set(alertId, alert);
        this.threatHistory.push(alert);
        
        // Emit alert event
        this.emit('alert_created', alert);
        
        // Send notifications based on threat level
        await this.sendAlertNotifications(alert);
        
        console.log(`Security alert created: ${alertId} - ${alert.title}`);
        return alert;
    }

    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId, acknowledgedBy = 'system') {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        
        alert.acknowledged = true;
        alert.acknowledgedBy = acknowledgedBy;
        alert.acknowledgedAt = new Date().toISOString();
        
        this.emit('alert_acknowledged', alert);
        console.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
        
        return alert;
    }

    /**
     * Resolve alert
     */
    resolveAlert(alertId, resolution, resolvedBy = 'system') {
        const alert = this.activeAlerts.get(alertId);
        if (!alert) {
            throw new Error(`Alert not found: ${alertId}`);
        }
        
        alert.status = 'resolved';
        alert.resolution = resolution;
        alert.resolvedBy = resolvedBy;
        alert.resolvedAt = new Date().toISOString();
        
        this.activeAlerts.delete(alertId);
        
        this.emit('alert_resolved', alert);
        console.log(`Alert resolved: ${alertId} - ${resolution}`);
        
        return alert;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts(filter = {}) {
        let alerts = Array.from(this.activeAlerts.values());
        
        if (filter.level) {
            alerts = alerts.filter(alert => alert.level === filter.level);
        }
        
        if (filter.type) {
            alerts = alerts.filter(alert => alert.threat.type === filter.type);
        }
        
        if (filter.acknowledged !== undefined) {
            alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
        }
        
        return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Get threat history
     */
    getThreatHistory(limit = 100, filter = {}) {
        let history = [...this.threatHistory];
        
        if (filter.level) {
            history = history.filter(threat => threat.level === filter.level);
        }
        
        if (filter.type) {
            history = history.filter(threat => threat.threat.type === filter.type);
        }
        
        return history
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    /**
     * Generate security report
     */
    async generateSecurityReport(timeRange = '30d') {
        try {
            const endTime = new Date();
            const startTime = new Date();
            
            switch (timeRange) {
                case '7d':
                    startTime.setDate(endTime.getDate() - 7);
                    break;
                case '30d':
                    startTime.setDate(endTime.getDate() - 30);
                    break;
                case '90d':
                    startTime.setDate(endTime.getDate() - 90);
                    break;
                default:
                    startTime.setDate(endTime.getDate() - 30);
            }
            
            const report = {
                timeRange,
                generatedAt: new Date().toISOString(),
                summary: {
                    totalThreats: 0,
                    criticalThreats: 0,
                    highThreats: 0,
                    mediumThreats: 0,
                    lowThreats: 0,
                    resolvedThreats: 0,
                    activeAlerts: 0
                },
                threatTypes: {},
                trends: {},
                recommendations: []
            };
            
            // Analyze threat history
            const threatsInRange = this.threatHistory.filter(
                threat => new Date(threat.timestamp) >= startTime
            );
            
            report.summary.totalThreats = threatsInRange.length;
            
            threatsInRange.forEach(threat => {
                const level = threat.level || threat.threat?.level;
                const type = threat.threat?.type || 'unknown';
                
                // Count by level
                switch (level) {
                    case this.threatLevels.CRITICAL:
                        report.summary.criticalThreats++;
                        break;
                    case this.threatLevels.HIGH:
                        report.summary.highThreats++;
                        break;
                    case this.threatLevels.MEDIUM:
                        report.summary.mediumThreats++;
                        break;
                    case this.threatLevels.LOW:
                        report.summary.lowThreats++;
                        break;
                }
                
                // Count by type
                if (!report.threatTypes[type]) {
                    report.threatTypes[type] = 0;
                }
                report.threatTypes[type]++;
                
                // Count resolved
                if (threat.status === 'resolved') {
                    report.summary.resolvedThreats++;
                }
            });
            
            report.summary.activeAlerts = this.activeAlerts.size;
            
            // Generate recommendations
            report.recommendations = this.generateSecurityRecommendations(report);
            
            return report;
            
        } catch (error) {
            console.error('Security report generation failed:', error);
            throw error;
        }
    }

    // Private helper methods

    setupEventListeners() {
        this.on('alert_created', (alert) => {
            console.log(`ALERT: ${alert.title} (${alert.level})`);
        });
        
        this.on('threat_detected', (threat) => {
            this.createAlert(threat);
        });
    }

    async processScanResults(scanResults) {
        for (const threat of scanResults.threats) {
            this.emit('threat_detected', threat);
        }
        
        // Store scan results
        this.threatHistory.push({
            type: 'scan_result',
            scanId: scanResults.scanId,
            timestamp: scanResults.timestamp,
            threats: scanResults.threats,
            securityScore: scanResults.securityScore
        });
    }

    calculateSecurityScore(scanResults) {
        let score = 100;
        
        scanResults.threats.forEach(threat => {
            switch (threat.level) {
                case this.threatLevels.CRITICAL:
                    score -= 25;
                    break;
                case this.threatLevels.HIGH:
                    score -= 15;
                    break;
                case this.threatLevels.MEDIUM:
                    score -= 8;
                    break;
                case this.threatLevels.LOW:
                    score -= 3;
                    break;
            }
        });
        
        return Math.max(0, score);
    }

    async assessAlgorithmVulnerability(key) {
        const vulnerableAlgorithms = ['RSA-2048', 'ECDSA-256', 'DSA-1024'];
        const isVulnerable = vulnerableAlgorithms.some(vuln => 
            key.algorithm.includes(vuln)
        );
        
        return {
            isVulnerable,
            riskLevel: isVulnerable ? 'high' : 'low',
            quantumVulnerable: isVulnerable,
            recommendedReplacement: isVulnerable ? 'CRYSTALS_KYBER' : key.algorithm
        };
    }

    getVulnerabilityRecommendation(vulnerability) {
        if (vulnerability.isVulnerable) {
            return `Immediately migrate to ${vulnerability.recommendedReplacement} for quantum resistance`;
        }
        return 'Current algorithm is secure';
    }

    calculateKeyAge(createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        return Math.floor((now - created) / (24 * 60 * 60 * 1000)); // days
    }

    async checkQuantumAdvancementFeeds() {
        // Simulate quantum advancement detection
        const advancements = [];
        
        // In a real implementation, this would fetch from actual sources
        if (Math.random() < 0.1) { // 10% chance of detecting advancement
            advancements.push({
                title: 'Quantum Computer Breakthrough in Error Correction',
                impact: 'critical',
                description: 'New error correction techniques increase qubit stability',
                source: 'simulated',
                timestamp: new Date().toISOString()
            });
        }
        
        return advancements;
    }

    async detectCryptographicAnomalies() {
        // Simulate anomaly detection
        const anomalies = [];
        
        // In a real implementation, this would analyze actual usage patterns
        if (Math.random() < 0.05) { // 5% chance of detecting anomaly
            anomalies.push({
                type: 'unusual_decryption_attempts',
                severity: 'high',
                description: 'Multiple failed decryption attempts detected',
                source: 'system_monitoring',
                timestamp: new Date().toISOString()
            });
        }
        
        return anomalies;
    }

    async fetchThreatFeed(feedUrl) {
        // Simulate fetching external threat feeds
        // In a real implementation, this would make HTTP requests to actual feeds
        return [];
    }

    generateAlertTitle(threat) {
        const titles = {
            [this.threatTypes.QUANTUM_COMPUTING_ADVANCEMENT]: 'Quantum Computing Advancement Detected',
            [this.threatTypes.VULNERABLE_ALGORITHM_DETECTED]: 'Vulnerable Algorithm Detected',
            [this.threatTypes.KEY_COMPROMISE_SUSPECTED]: 'Key Compromise Suspected',
            [this.threatTypes.QUANTUM_ATTACK_DETECTED]: 'Quantum Attack Detected',
            [this.threatTypes.OUTDATED_CRYPTOGRAPHY]: 'Outdated Cryptography Detected',
            [this.threatTypes.QUANTUM_SUPREMACY_MILESTONE]: 'Quantum Supremacy Milestone Reached'
        };
        
        return titles[threat.type] || 'Security Threat Detected';
    }

    generateAlertRecommendations(threat) {
        const recommendations = {
            [this.threatTypes.VULNERABLE_ALGORITHM_DETECTED]: [
                'Immediately migrate to post-quantum cryptographic algorithms',
                'Update all affected systems with quantum-resistant encryption',
                'Schedule regular security audits'
            ],
            [this.threatTypes.OUTDATED_CRYPTOGRAPHY]: [
                'Rotate outdated cryptographic keys immediately',
                'Implement automated key rotation policies',
                'Review and update encryption standards'
            ],
            [this.threatTypes.QUANTUM_COMPUTING_ADVANCEMENT]: [
                'Assess impact on current cryptographic infrastructure',
                'Accelerate migration to post-quantum cryptography',
                'Monitor quantum computing developments closely'
            ]
        };
        
        return recommendations[threat.type] || ['Review security policies', 'Consult cryptographic experts'];
    }

    async sendAlertNotifications(alert) {
        // In a real implementation, this would send emails, SMS, push notifications, etc.
        console.log(`NOTIFICATION: ${alert.title} - ${alert.description}`);
        
        if (alert.level >= this.threatLevels.HIGH) {
            console.log(`HIGH PRIORITY NOTIFICATION: Immediate attention required for ${alert.id}`);
        }
    }

    generateSecurityRecommendations(report) {
        const recommendations = [];
        
        if (report.summary.criticalThreats > 0) {
            recommendations.push('Critical threats detected - immediate action required');
        }
        
        if (report.summary.activeAlerts > 10) {
            recommendations.push('High number of active alerts - consider increasing security resources');
        }
        
        if (report.summary.resolvedThreats / report.summary.totalThreats < 0.8) {
            recommendations.push('Low threat resolution rate - review incident response procedures');
        }
        
        return recommendations;
    }
}

module.exports = new QuantumThreatMonitoringService();
