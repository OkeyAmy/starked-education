const tf = require('@tensorflow/tfjs-node');
const { EventEmitter } = require('events');
const crypto = require('crypto');

class ProctoringService extends EventEmitter {
    constructor() {
        super();
        this.activeSessions = new Map();
        this.anomalyThreshold = 0.85;
    }

    /**
     * Start a proctoring session
     * @param {string} sessionId 
     * @param {string} studentAddress 
     */
    startSession(sessionId, studentAddress) {
        this.activeSessions.set(sessionId, {
            studentAddress,
            startTime: Date.now(),
            anomalies: [],
            status: 'active'
        });
        console.log(`[Proctoring] Session ${sessionId} started for ${studentAddress}`);
    }

    /**
     * Analyze behavior frame
     * @param {string} sessionId 
     * @param {Object} behavioralData { headPose, gazeDirection, personCount, audioLevels }
     */
    async analyzeBehavior(sessionId, behavioralData) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        let suspicious = false;
        let reason = '';

        // 1. Multiple persons detected
        if (behavioralData.personCount > 1) {
            suspicious = true;
            reason = 'Multiple persons detected';
        }

        // 2. Eye gaze deviation
        if (Math.abs(behavioralData.gazeDirection.x) > 0.5 || Math.abs(behavioralData.gazeDirection.y) > 0.5) {
            suspicious = true;
            reason = 'Gaze deviation detected';
        }

        // 3. Audio spikes
        if (behavioralData.audioLevels > 0.7) {
            suspicious = true;
            reason = 'High ambient noise detected';
        }

        if (suspicious) {
            const anomaly = {
                timestamp: Date.now(),
                reason,
                dataHash: this.hashData(behavioralData)
            };
            session.anomalies.push(anomaly);
            this.emit('anomaly_detected', { sessionId, anomaly });
            
            if (session.anomalies.length > 5) {
                this.flagSession(sessionId, 'Frequent anomalies');
            }
        }

        return { suspicious, reason };
    }

    /**
     * Flag a session for review
     */
    flagSession(sessionId, reason) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = 'flagged';
            this.emit('session_flagged', { sessionId, reason });
        }
    }

    /**
     * End session and generate audit trail
     */
    endSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) return;

        session.status = 'completed';
        session.endTime = Date.now();
        
        const auditTrail = {
            sessionId,
            studentAddress: session.studentAddress,
            duration: session.endTime - session.startTime,
            anomalies: session.anomalies,
            finalStatus: session.status
        };

        const encryptedTrail = this.encryptData(JSON.stringify(auditTrail));
        this.activeSessions.delete(sessionId);
        
        return {
            auditTrail,
            encryptedTrail,
            hash: crypto.createHash('sha256').update(JSON.stringify(auditTrail)).digest('hex')
        };
    }

    hashData(data) {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    encryptData(data) {
        // Mock encryption
        const cipher = crypto.createCipher('aes-256-cbc', process.env.SESSION_SECRET || 'secret');
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }
}

module.exports = new ProctoringService();
