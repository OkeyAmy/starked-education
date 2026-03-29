'use client';

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, Activity, Zap } from 'lucide-react';
import { NeuralData, SafetyStatus, SafetyAlert } from '@/types/neural';

interface SafetyMonitorProps {
  safetyStatus: 'safe' | 'warning' | 'critical';
  neuralData: NeuralData | null;
  constraints: any; // SafetyConstraints type
}

export const SafetyMonitor: React.FC<SafetyMonitorProps> = ({
  safetyStatus,
  neuralData,
  constraints
}) => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    sensorConnection: 100,
    batteryLevel: 85,
    temperature: 36.5,
    impedance: 5.2
  });

  useEffect(() => {
    if (neuralData) {
      evaluateSafety(neuralData);
    }
  }, [neuralData]);

  const evaluateSafety = (data: NeuralData) => {
    const newAlerts: SafetyAlert[] = [];

    // Check signal quality
    if (data.signalQuality && data.signalQuality < 60) {
      newAlerts.push({
        type: 'signal_quality',
        severity: 'high',
        message: 'Poor signal quality detected. Check sensor connection.',
        timestamp: Date.now()
      });
    }

    // Check cognitive load
    if (data.cognitiveLoad > 0.85) {
      newAlerts.push({
        type: 'cognitive_load',
        severity: 'medium',
        message: 'High cognitive load detected. Consider reducing stimulation.',
        timestamp: Date.now()
      });
    }

    // Check heart rate
    if (data.heartRate > 120 || data.heartRate < 45) {
      newAlerts.push({
        type: 'intensity',
        severity: 'high',
        message: 'Abnormal heart rate detected. Stopping stimulation recommended.',
        timestamp: Date.now()
      });
    }

    // Check EEG patterns for abnormalities
    const totalEEG = Object.values(data.eegData).reduce((sum, val) => sum + val, 0);
    if (totalEEG > 400) {
      newAlerts.push({
        type: 'intensity',
        severity: 'high',
        message: 'Excessive neural activity detected. Immediate rest required.',
        timestamp: Date.now()
      });
    }

    setAlerts(newAlerts);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'safe': return 'bg-green-500/10 border-green-500/30';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'critical': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <Info className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'high': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getHealthColor = (value: number, type: string) => {
    if (type === 'battery') {
      if (value > 60) return 'text-green-400';
      if (value > 30) return 'text-yellow-400';
      return 'text-red-400';
    } else if (type === 'temperature') {
      if (value >= 36 && value <= 37.5) return 'text-green-400';
      if (value >= 35 && value <= 38) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value > 80) return 'text-green-400';
      if (value > 60) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Safety Monitor</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(safetyStatus)}`}>
          {safetyStatus === 'safe' && <CheckCircle className="h-4 w-4" />}
          {safetyStatus !== 'safe' && <AlertTriangle className="h-4 w-4" />}
          {safetyStatus.charAt(0).toUpperCase() + safetyStatus.slice(1)}
        </div>
      </div>

      {/* System Health */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">System Health</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Sensor Connection</span>
            <span className={`text-sm font-medium ${getHealthColor(systemHealth.sensorConnection, 'connection')}`}>
              {systemHealth.sensorConnection}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Battery Level</span>
            <span className={`text-sm font-medium ${getHealthColor(systemHealth.batteryLevel, 'battery')}`}>
              {systemHealth.batteryLevel}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Temperature</span>
            <span className={`text-sm font-medium ${getHealthColor(systemHealth.temperature, 'temperature')}`}>
              {systemHealth.temperature}°C
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Impedance</span>
            <span className={`text-sm font-medium ${getHealthColor((10 - systemHealth.impedance) * 10, 'connection')}`}>
              {systemHealth.impedance} kΩ
            </span>
          </div>
        </div>
      </div>

      {/* Safety Limits */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Safety Limits</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-3 w-3 text-yellow-400" />
              <span className="text-gray-300">Max Intensity</span>
            </div>
            <div className="text-lg font-bold text-yellow-400">
              {constraints.maxIntensity || 2000} μA
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-3 w-3 text-blue-400" />
              <span className="text-gray-300">Max Duration</span>
            </div>
            <div className="text-lg font-bold text-blue-400">
              {Math.round((constraints.maxDuration || 3600) / 60)} min
            </div>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Active Alerts</h3>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <div className="text-sm font-medium mb-1">
                      {alert.type.replace('_', ' ').charAt(0).toUpperCase() + alert.type.replace('_', ' ').slice(1)}
                    </div>
                    <div className="text-xs opacity-80">{alert.message}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safety Recommendations */}
      <div className={`p-4 rounded-lg border ${getStatusBg(safetyStatus)}`}>
        <div className="flex items-start gap-2 mb-2">
          <Info className="h-4 w-4 mt-0.5" />
          <div>
            <div className={`font-medium text-sm mb-1 ${getStatusColor(safetyStatus)}`}>
              Safety Recommendations
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              {safetyStatus === 'safe' && (
                <>
                  <div>• All systems operating within normal parameters</div>
                  <div>• Continue monitoring cognitive responses</div>
                  <div>• Take breaks every 45-60 minutes</div>
                </>
              )}
              {safetyStatus === 'warning' && (
                <>
                  <div>• Monitor alerts closely and follow recommendations</div>
                  <div>• Consider reducing stimulation intensity</div>
                  <div>• Take a short break if symptoms persist</div>
                </>
              )}
              {safetyStatus === 'critical' && (
                <>
                  <div>• Stop stimulation immediately</div>
                  <div>• Remove sensors and rest for 15 minutes</div>
                  <div>• Consult healthcare provider if symptoms continue</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Stop */}
      <button
        className={`w-full mt-4 px-4 py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
          safetyStatus === 'critical'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
        }`}
        disabled={safetyStatus !== 'critical'}
      >
        <AlertTriangle className="h-4 w-4" />
        Emergency Stop
      </button>
    </div>
  );
};
