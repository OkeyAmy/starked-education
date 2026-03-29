'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Activity, TrendingUp, AlertTriangle, Eye, Coffee } from 'lucide-react';
import { NeuralData, LearningMetrics } from '@/types/neural';

interface CognitiveMonitorProps {
  neuralData: NeuralData | null;
  learningMetrics: LearningMetrics | null;
  onMetricsUpdate: (metrics: LearningMetrics) => void;
}

export const CognitiveMonitor: React.FC<CognitiveMonitorProps> = ({
  neuralData,
  learningMetrics,
  onMetricsUpdate
}) => {
  const [cognitiveState, setCognitiveState] = useState<'optimal' | 'fatigued' | 'overloaded' | 'distracted'>('optimal');
  const [focusScore, setFocusScore] = useState(0);
  const [engagementLevel, setEngagementLevel] = useState(0);
  const [mentalWorkload, setMentalWorkload] = useState(0);
  const [comprehensionScore, setComprehensionScore] = useState(0);

  useEffect(() => {
    if (neuralData) {
      analyzeCognitiveState(neuralData);
    }
  }, [neuralData]);

  const analyzeCognitiveState = (data: NeuralData) => {
    // Calculate cognitive metrics based on neural data
    const newFocusScore = calculateFocusScore(data);
    const newEngagementLevel = calculateEngagementLevel(data);
    const newMentalWorkload = calculateMentalWorkload(data);
    const newComprehensionScore = calculateComprehensionScore(data);

    setFocusScore(newFocusScore);
    setEngagementLevel(newEngagementLevel);
    setMentalWorkload(newMentalWorkload);
    setComprehensionScore(newComprehensionScore);

    // Determine cognitive state
    let state: 'optimal' | 'fatigued' | 'overloaded' | 'distracted' = 'optimal';
    
    if (newMentalWorkload > 0.8) {
      state = 'overloaded';
    } else if (newFocusScore < 0.4) {
      state = 'distracted';
    } else if (data.eegData.theta > 70 && data.eegData.beta < 30) {
      state = 'fatigued';
    }

    setCognitiveState(state);

    // Update learning metrics
    const metrics: LearningMetrics = {
      efficiency: calculateEfficiency(newFocusScore, newEngagementLevel),
      comprehension: newComprehensionScore,
      retention: calculateRetention(data),
      cognitiveLoad: newMentalWorkload,
      attention: data.attention,
      meditation: data.meditation,
      focusScore: newFocusScore,
      fatigueLevel: calculateFatigueLevel(data)
    };

    onMetricsUpdate(metrics);
  };

  const calculateFocusScore = (data: NeuralData): number => {
    // Focus is high when beta waves are elevated and theta is low
    const betaDominance = data.eegData.beta / (data.eegData.beta + data.eegData.theta);
    const attentionFactor = data.attention;
    return Math.min(1, (betaDominance * 0.7 + attentionFactor * 0.3));
  };

  const calculateEngagementLevel = (data: NeuralData): number => {
    // Engagement is indicated by balanced beta and gamma activity
    const engagement = (data.eegData.beta + data.eegData.gamma) / 2;
    return Math.min(1, engagement / 100);
  };

  const calculateMentalWorkload = (data: NeuralData): number => {
    // Mental workload increases with overall EEG activity
    const totalActivity = Object.values(data.eegData).reduce((sum, val) => sum + val, 0);
    return Math.min(1, totalActivity / 500);
  };

  const calculateComprehensionScore = (data: NeuralData): number => {
    // Comprehension is related to alpha-beta balance and attention
    const alphaBetaRatio = data.eegData.alpha / data.eegData.beta;
    const optimalRatio = 0.8;
    const ratioScore = 1 - Math.abs(alphaBetaRatio - optimalRatio) / optimalRatio;
    return Math.max(0, Math.min(1, ratioScore * data.attention));
  };

  const calculateRetention = (data: NeuralData): number => {
    // Retention is better with theta activity during learning
    const thetaActivity = data.eegData.theta / 100;
    const attentionFactor = data.attention;
    return Math.min(1, (thetaActivity * 0.6 + attentionFactor * 0.4));
  };

  const calculateEfficiency = (focus: number, engagement: number): number => {
    return (focus * 0.6 + engagement * 0.4);
  };

  const calculateFatigueLevel = (data: NeuralData): number => {
    // Fatigue increases with theta dominance and decreased beta
    const thetaBetaRatio = data.eegData.theta / data.eegData.beta;
    return Math.min(1, thetaBetaRatio / 3);
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'optimal': return 'text-green-400';
      case 'fatigued': return 'text-yellow-400';
      case 'overloaded': return 'text-red-400';
      case 'distracted': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'optimal': return <Brain className="h-4 w-4" />;
      case 'fatigued': return <Coffee className="h-4 w-4" />;
      case 'overloaded': return <AlertTriangle className="h-4 w-4" />;
      case 'distracted': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricColor = (value: number, type: string) => {
    if (type === 'workload') {
      if (value < 0.4) return 'text-green-400';
      if (value < 0.7) return 'text-yellow-400';
      return 'text-red-400';
    } else {
      if (value > 0.7) return 'text-green-400';
      if (value > 0.4) return 'text-yellow-400';
      return 'text-red-400';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Cognitive Monitor</h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStateColor(cognitiveState)}`}>
          {getStateIcon(cognitiveState)}
          {cognitiveState.charAt(0).toUpperCase() + cognitiveState.slice(1)}
        </div>
      </div>

      {/* Cognitive Metrics */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Focus Score</span>
            <span className={`text-sm font-medium ${getMetricColor(focusScore, 'focus')}`}>
              {Math.round(focusScore * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-blue-500"
              style={{ width: `${focusScore * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Engagement Level</span>
            <span className={`text-sm font-medium ${getMetricColor(engagementLevel, 'engagement')}`}>
              {Math.round(engagementLevel * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-purple-500"
              style={{ width: `${engagementLevel * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Mental Workload</span>
            <span className={`text-sm font-medium ${getMetricColor(mentalWorkload, 'workload')}`}>
              {Math.round(mentalWorkload * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-orange-500"
              style={{ width: `${mentalWorkload * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">Comprehension</span>
            <span className={`text-sm font-medium ${getMetricColor(comprehensionScore, 'comprehension')}`}>
              {Math.round(comprehensionScore * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-300 bg-green-500"
              style={{ width: `${comprehensionScore * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cognitive State Recommendations */}
      <div className={`p-4 rounded-lg border ${
        cognitiveState === 'optimal' ? 'bg-green-500/10 border-green-500/30' :
        cognitiveState === 'fatigued' ? 'bg-yellow-500/10 border-yellow-500/30' :
        cognitiveState === 'overloaded' ? 'bg-red-500/10 border-red-500/30' :
        'bg-orange-500/10 border-orange-500/30'
      }`}>
        <div className="flex items-start gap-2 mb-2">
          {getStateIcon(cognitiveState)}
          <div>
            <div className={`font-medium text-sm mb-1 ${getStateColor(cognitiveState)}`}>
              {cognitiveState === 'optimal' && 'Optimal Learning State'}
              {cognitiveState === 'fatigued' && 'Fatigue Detected'}
              {cognitiveState === 'overloaded' && 'Cognitive Overload'}
              {cognitiveState === 'distracted' && 'Attention Drift'}
            </div>
            <div className="text-xs text-gray-300">
              {cognitiveState === 'optimal' && 'Continue current learning pace. All metrics are within optimal ranges.'}
              {cognitiveState === 'fatigued' && 'Consider taking a short break. Theta waves indicate mental fatigue.'}
              {cognitiveState === 'overloaded' && 'Reduce stimulation intensity or take a break to prevent cognitive burnout.'}
              {cognitiveState === 'distracted' && 'Focus has decreased. Try re-engaging with the content.'}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time EEG Data */}
      {neuralData && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Real-time EEG Activity</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Delta:</span>
              <span className="text-gray-300">{Math.round(neuralData.eegData.delta)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Theta:</span>
              <span className="text-gray-300">{Math.round(neuralData.eegData.theta)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Alpha:</span>
              <span className="text-gray-300">{Math.round(neuralData.eegData.alpha)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Beta:</span>
              <span className="text-gray-300">{Math.round(neuralData.eegData.beta)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Gamma:</span>
              <span className="text-gray-300">{Math.round(neuralData.eegData.gamma)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Heart Rate:</span>
              <span className="text-gray-300">{Math.round(neuralData.heartRate)} bpm</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
