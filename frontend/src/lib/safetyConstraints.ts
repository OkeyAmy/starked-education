import { NeuralData, SafetyStatus, SafetyAlert, SafetyLimits } from '@/types/neural';

export class SafetyConstraints {
  private readonly safetyLimits: SafetyLimits = {
    maxIntensity: 2000, // μA
    maxDuration: 3600, // seconds (1 hour)
    minRestPeriod: 300, // seconds (5 minutes)
    dailyLimit: 7200 // seconds (2 hours)
  };

  private readonly physiologicalLimits = {
    maxHeartRate: 120, // bpm
    minHeartRate: 45, // bpm
    maxTemperature: 38.5, // °C
    minTemperature: 35.0, // °C
    maxImpedance: 10.0, // kΩ
    minSignalQuality: 60 // %
  };

  private readonly neuralLimits = {
    maxCognitiveLoad: 0.85,
    maxEEGPower: 400, // total power across all bands
    maxThetaBetaRatio: 3.0,
    minAttentionThreshold: 0.1,
    maxFatigueLevel: 0.8
  };

  evaluateSafety(data: NeuralData): SafetyStatus {
    const alerts: SafetyAlert[] = [];
    let status: 'safe' | 'warning' | 'critical' = 'safe';

    // Check physiological parameters
    const physiologicalAlerts = this.checkPhysiologicalSafety(data);
    alerts.push(...physiologicalAlerts);

    // Check neural parameters
    const neuralAlerts = this.checkNeuralSafety(data);
    alerts.push(...neuralAlerts);

    // Check signal quality
    const signalAlerts = this.checkSignalQuality(data);
    alerts.push(...signalAlerts);

    // Determine overall safety status
    const criticalAlerts = alerts.filter(alert => alert.severity === 'high');
    const warningAlerts = alerts.filter(alert => alert.severity === 'medium');

    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (warningAlerts.length > 0) {
      status = 'warning';
    }

    const recommendations = this.generateRecommendations(alerts, status);

    return {
      status,
      alerts,
      recommendations
    };
  }

  private checkPhysiologicalSafety(data: NeuralData): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // Heart rate checks
    if (data.heartRate > this.physiologicalLimits.maxHeartRate) {
      alerts.push({
        type: 'intensity',
        severity: 'high',
        message: `Heart rate too high: ${data.heartRate} bpm. Reduce stimulation immediately.`,
        timestamp: Date.now()
      });
    } else if (data.heartRate < this.physiologicalLimits.minHeartRate) {
      alerts.push({
        type: 'intensity',
        severity: 'medium',
        message: `Heart rate too low: ${data.heartRate} bpm. Monitor closely.`,
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  private checkNeuralSafety(data: NeuralData): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    // Cognitive load check
    if (data.cognitiveLoad > this.neuralLimits.maxCognitiveLoad) {
      alerts.push({
        type: 'cognitive_load',
        severity: 'medium',
        message: `High cognitive load: ${Math.round(data.cognitiveLoad * 100)}%. Consider taking a break.`,
        timestamp: Date.now()
      });
    }

    // EEG power check
    const totalEEGPower = Object.values(data.eegData).reduce((sum, val) => sum + val, 0);
    if (totalEEGPower > this.neuralLimits.maxEEGPower) {
      alerts.push({
        type: 'intensity',
        severity: 'high',
        message: `Excessive neural activity detected. Immediate rest required.`,
        timestamp: Date.now()
      });
    }

    // Theta/Beta ratio check (indicator of fatigue/drowsiness)
    const thetaBetaRatio = data.eegData.theta / (data.eegData.beta + 0.001);
    if (thetaBetaRatio > this.neuralLimits.maxThetaBetaRatio) {
      alerts.push({
        type: 'cognitive_load',
        severity: 'medium',
        message: `High theta/beta ratio indicates fatigue. Consider ending session.`,
        timestamp: Date.now()
      });
    }

    // Attention check
    if (data.attention < this.neuralLimits.minAttentionThreshold) {
      alerts.push({
        type: 'cognitive_load',
        severity: 'low',
        message: `Low attention level detected. Re-engage with content.`,
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  private checkSignalQuality(data: NeuralData): SafetyAlert[] {
    const alerts: SafetyAlert[] = [];

    if (data.signalQuality && data.signalQuality < this.physiologicalLimits.minSignalQuality) {
      alerts.push({
        type: 'signal_quality',
        severity: data.signalQuality < 40 ? 'high' : 'medium',
        message: `Poor signal quality: ${Math.round(data.signalQuality)}%. Check sensor connection.`,
        timestamp: Date.now()
      });
    }

    return alerts;
  }

  private generateRecommendations(alerts: SafetyAlert[], status: string): string[] {
    const recommendations: string[] = [];

    if (status === 'critical') {
      recommendations.push('Stop stimulation immediately');
      recommendations.push('Remove sensors and rest for 15 minutes');
      recommendations.push('Consult healthcare provider if symptoms persist');
    } else if (status === 'warning') {
      recommendations.push('Monitor alerts closely and follow recommendations');
      recommendations.push('Consider reducing stimulation intensity');
      recommendations.push('Take a short break if symptoms persist');
    } else {
      recommendations.push('All systems operating within normal parameters');
      recommendations.push('Continue monitoring cognitive responses');
      recommendations.push('Take breaks every 45-60 minutes');
    }

    // Add specific recommendations based on alert types
    const alertTypes = [...new Set(alerts.map(alert => alert.type))];
    
    if (alertTypes.includes('signal_quality')) {
      recommendations.push('Check sensor placement and connection');
      recommendations.push('Ensure skin is clean and dry');
    }

    if (alertTypes.includes('cognitive_load')) {
      recommendations.push('Reduce stimulation intensity');
      recommendations.push('Take more frequent breaks');
    }

    if (alertTypes.includes('intensity')) {
      recommendations.push('Lower stimulation settings');
      recommendations.push('Monitor physiological responses');
    }

    return recommendations;
  }

  getSafetyLimits(): SafetyLimits {
    return { ...this.safetyLimits };
  }

  validateStimulationSettings(intensity: number, duration: number): {
    isValid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    if (intensity > this.safetyLimits.maxIntensity) {
      violations.push(`Intensity exceeds maximum limit of ${this.safetyLimits.maxIntensity} μA`);
    }

    if (duration > this.safetyLimits.maxDuration) {
      violations.push(`Duration exceeds maximum limit of ${this.safetyLimits.maxDuration} seconds`);
    }

    if (intensity < 0) {
      violations.push('Intensity cannot be negative');
    }

    if (duration < 60) {
      violations.push('Duration must be at least 60 seconds');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  calculateOptimalRestPeriod(sessionDuration: number, cognitiveLoad: number): number {
    // Base rest period calculation
    let restPeriod = this.safetyLimits.minRestPeriod;

    // Adjust based on session duration
    if (sessionDuration > 1800) { // 30 minutes
      restPeriod += 300; // Add 5 minutes
    }

    // Adjust based on cognitive load
    if (cognitiveLoad > 0.7) {
      restPeriod += 300; // Add 5 minutes
    }

    // Cap at reasonable maximum
    return Math.min(restPeriod, 900); // Max 15 minutes
  }

  checkDailyUsage(totalDailyTime: number): {
    isWithinLimit: boolean;
    remainingTime: number;
    recommendations: string[];
  } {
    const isWithinLimit = totalDailyTime <= this.safetyLimits.dailyLimit;
    const remainingTime = Math.max(0, this.safetyLimits.dailyLimit - totalDailyTime);
    const recommendations: string[] = [];

    if (!isWithinLimit) {
      recommendations.push('Daily stimulation limit exceeded');
      recommendations.push('Wait until tomorrow for next session');
    } else if (remainingTime < this.safetyLimits.maxDuration) {
      recommendations.push('Limited daily time remaining');
      recommendations.push(`Consider shorter session (${Math.floor(remainingTime / 60)} minutes max)`);
    }

    return {
      isWithinLimit,
      remainingTime,
      recommendations
    };
  }

  getEmergencyProtocols(): {
    conditions: string[];
    actions: string[];
  } {
    return {
      conditions: [
        'Heart rate exceeds 140 bpm',
        'Severe headache or dizziness',
        'Skin irritation or burning sensation',
        'Loss of consciousness or confusion',
        'Seizure activity'
      ],
      actions: [
        'Stop stimulation immediately',
        'Remove all sensors and devices',
        'Call emergency services if severe',
        'Document symptoms and time of onset',
        'Seek medical evaluation'
      ]
    };
  }
}
