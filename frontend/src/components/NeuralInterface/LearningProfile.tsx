'use client';

import React, { useState, useEffect } from 'react';
import { User, TrendingUp, Brain, Target, Clock, Award } from 'lucide-react';
import { LearningMetrics, LearningSession, NeuralProfile } from '@/types/neural';

interface LearningProfileProps {
  userId: string;
  learningMetrics: LearningMetrics | null;
  sessionData: LearningSession | null;
}

export const LearningProfile: React.FC<LearningProfileProps> = ({
  userId,
  learningMetrics,
  sessionData
}) => {
  const [profile, setProfile] = useState<NeuralProfile | null>(null);
  const [sessionHistory, setSessionHistory] = useState<LearningSession[]>([]);
  const [learningStats, setLearningStats] = useState({
    totalSessions: 0,
    totalLearningTime: 0,
    averageEfficiency: 0,
    bestSession: null as LearningSession | null,
    improvementRate: 0
  });

  useEffect(() => {
    loadUserProfile();
    loadSessionHistory();
  }, [userId]);

  useEffect(() => {
    if (learningMetrics && sessionData) {
      updateLearningStats();
    }
  }, [learningMetrics, sessionData]);

  const loadUserProfile = async () => {
    // Mock profile data
    const mockProfile: NeuralProfile = {
      userId,
      baselineMetrics: {
        efficiency: 0.65,
        comprehension: 0.70,
        retention: 0.60,
        cognitiveLoad: 0.45,
        attention: 0.75,
        meditation: 0.50,
        focusScore: 0.68,
        fatigueLevel: 0.20
      },
      optimalStimulation: {
        intensity: 1000,
        frequency: 10,
        duration: 1800,
        targetRegions: ['prefrontal', 'parietal'],
        protocol: 'tDCS',
        safetyLimits: {
          maxIntensity: 2000,
          maxDuration: 3600,
          minRestPeriod: 300,
          dailyLimit: 7200
        }
      },
      learningStyle: 'Visual-Kinesthetic',
      cognitivePatterns: [
        {
          pattern: 'Peak Focus Morning',
          frequency: 0.85,
          impact: 0.92,
          description: 'Best learning performance occurs in morning hours'
        },
        {
          pattern: 'Beta Wave Dominance',
          frequency: 0.78,
          impact: 0.88,
          description: 'Strong analytical thinking with beta wave dominance'
        }
      ],
      preferences: {
        preferredIntensity: 1200,
        preferredDuration: 1800,
        comfortLevel: 'medium',
        adaptiveMode: true
      }
    };
    setProfile(mockProfile);
  };

  const loadSessionHistory = async () => {
    // Mock session history
    const mockHistory: LearningSession[] = [
      {
        id: 'session-1',
        userId,
        courseId: 'intro-blockchain',
        startTime: Date.now() - 86400000, // 1 day ago
        endTime: Date.now() - 86400000 + 1800000, // 30 min session
        status: 'completed',
        content: {
          id: 'intro-blockchain',
          title: 'Introduction to Blockchain',
          type: 'interactive',
          difficulty: 'beginner',
          estimatedDuration: 1800
        }
      },
      {
        id: 'session-2',
        userId,
        courseId: 'stellar-development',
        startTime: Date.now() - 172800000, // 2 days ago
        endTime: Date.now() - 172800000 + 2400000, // 40 min session
        status: 'completed',
        content: {
          id: 'stellar-development',
          title: 'Stellar Development Fundamentals',
          type: 'video',
          difficulty: 'intermediate',
          estimatedDuration: 2400
        }
      }
    ];
    setSessionHistory(mockHistory);
  };

  const updateLearningStats = () => {
    const completedSessions = sessionHistory.filter(s => s.status === 'completed');
    const totalTime = completedSessions.reduce((sum, session) => {
      return sum + (session.endTime! - session.startTime);
    }, 0);

    const avgEfficiency = learningMetrics?.efficiency || 0;
    const bestSession = completedSessions.reduce((best, current) => {
      // In real implementation, this would compare actual session metrics
      return current;
    }, completedSessions[0]);

    setLearningStats({
      totalSessions: completedSessions.length,
      totalLearningTime: totalTime,
      averageEfficiency: avgEfficiency,
      bestSession,
      improvementRate: calculateImprovementRate()
    });
  };

  const calculateImprovementRate = (): number => {
    // Mock calculation - in real implementation would compare recent vs older sessions
    return 0.15; // 15% improvement
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  const getLearningStyleColor = (style: string): string => {
    if (style.includes('Visual')) return 'text-purple-400';
    if (style.includes('Auditory')) return 'text-blue-400';
    if (style.includes('Kinesthetic')) return 'text-green-400';
    return 'text-gray-400';
  };

  const getPerformanceColor = (value: number): string => {
    if (value > 0.8) return 'text-green-400';
    if (value > 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-semibold">Learning Profile</h2>
        </div>
        <div className="text-sm text-gray-400">
          ID: {userId.slice(0, 8)}...
        </div>
      </div>

      {/* Learning Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Learning Statistics</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-3 w-3 text-blue-400" />
              <span className="text-xs text-gray-400">Total Sessions</span>
            </div>
            <div className="text-lg font-bold text-blue-400">
              {learningStats.totalSessions}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3 w-3 text-green-400" />
              <span className="text-xs text-gray-400">Total Time</span>
            </div>
            <div className="text-lg font-bold text-green-400">
              {formatDuration(learningStats.totalLearningTime)}
            </div>
          </div>
        </div>
      </div>

      {/* Current Performance */}
      {learningMetrics && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Current Performance</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Efficiency</span>
              <span className={`text-sm font-medium ${getPerformanceColor(learningMetrics.efficiency)}`}>
                {Math.round(learningMetrics.efficiency * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Comprehension</span>
              <span className={`text-sm font-medium ${getPerformanceColor(learningMetrics.comprehension)}`}>
                {Math.round(learningMetrics.comprehension * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Retention</span>
              <span className={`text-sm font-medium ${getPerformanceColor(learningMetrics.retention)}`}>
                {Math.round(learningMetrics.retention * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Focus Score</span>
              <span className={`text-sm font-medium ${getPerformanceColor(learningMetrics.focusScore)}`}>
                {Math.round(learningMetrics.focusScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Learning Style */}
      {profile && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Learning Style</h3>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className={`font-medium ${getLearningStyleColor(profile.learningStyle)}`}>
                {profile.learningStyle}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Preferred intensity: {profile.preferences.preferredIntensity} μA
            </div>
            <div className="text-xs text-gray-400">
              Comfort level: {profile.preferences.comfortLevel}
            </div>
          </div>
        </div>
      )}

      {/* Cognitive Patterns */}
      {profile && profile.cognitivePatterns.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Cognitive Patterns</h3>
          <div className="space-y-2">
            {profile.cognitivePatterns.map((pattern, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">
                    {pattern.pattern}
                  </span>
                  <span className="text-xs text-green-400">
                    {Math.round(pattern.frequency * 100)}% freq
                  </span>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  {pattern.description}
                </div>
                <div className="text-xs text-purple-400">
                  Impact: {Math.round(pattern.impact * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      {sessionHistory.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Recent Sessions</h3>
          <div className="space-y-2">
            {sessionHistory.slice(0, 3).map((session) => (
              <div key={session.id} className="bg-white/5 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-300">
                    {session.content.title}
                  </span>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    session.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {session.status}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {formatDuration(session.endTime! - session.startTime)} • {session.content.difficulty}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Rate */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/30">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-400">Learning Progress</span>
        </div>
        <div className="text-lg font-bold text-purple-400 mb-1">
          +{Math.round(learningStats.improvementRate * 100)}%
        </div>
        <div className="text-xs text-gray-300">
          Improvement rate compared to baseline
        </div>
        {learningStats.averageEfficiency > 0.7 && (
          <div className="mt-2 flex items-center gap-1">
            <Award className="h-3 w-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">High Performer</span>
          </div>
        )}
      </div>
    </div>
  );
};
