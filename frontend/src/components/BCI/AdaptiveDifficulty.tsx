import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, Settings, BarChart3, Target, Zap, Award } from 'lucide-react';
import { bciService, CognitiveState } from '../../lib/bci/bciService';

interface DifficultyLevel {
  level: number;
  name: string;
  description: string;
  cognitiveThreshold: number;
  performanceThreshold: number;
  adaptations: string[];
}

interface AdaptiveMetrics {
  currentDifficulty: number;
  targetDifficulty: number;
  adaptationRate: number;
  performanceScore: number;
  cognitiveEfficiency: number;
  learningVelocity: number;
  difficultyHistory: number[];
}

interface PerformanceData {
  timestamp: number;
  difficulty: number;
  cognitiveLoad: number;
  success: boolean;
  timeSpent: number;
}

export const AdaptiveDifficulty: React.FC = () => {
  const [metrics, setMetrics] = useState<AdaptiveMetrics>({
    currentDifficulty: 1,
    targetDifficulty: 1,
    adaptationRate: 0,
    performanceScore: 0,
    cognitiveEfficiency: 0,
    learningVelocity: 0,
    difficultyHistory: []
  });

  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [isAdaptiveMode, setIsAdaptiveMode] = useState(false);
  const [manualDifficulty, setManualDifficulty] = useState(1);
  const [adaptationSettings, setAdaptationSettings] = useState({
    cognitiveWeight: 0.4,
    performanceWeight: 0.6,
    adaptationSpeed: 0.1,
    minDifficulty: 1,
    maxDifficulty: 10
  });

  const difficultyLevels: DifficultyLevel[] = [
    {
      level: 1,
      name: 'Beginner',
      description: 'Basic concepts with minimal cognitive load',
      cognitiveThreshold: 0.3,
      performanceThreshold: 0.8,
      adaptations: ['Simplified content', 'Extended time', 'More hints']
    },
    {
      level: 2,
      name: 'Novice',
      description: 'Introduction to core concepts',
      cognitiveThreshold: 0.4,
      performanceThreshold: 0.75,
      adaptations: ['Moderate pacing', 'Some guidance', 'Practice exercises']
    },
    {
      level: 3,
      name: 'Intermediate',
      description: 'Developing skills with moderate challenge',
      cognitiveThreshold: 0.5,
      performanceThreshold: 0.7,
      adaptations: ['Balanced content', 'Limited hints', 'Timed exercises']
    },
    {
      level: 4,
      name: 'Advanced',
      description: 'Complex concepts requiring focus',
      cognitiveThreshold: 0.6,
      performanceThreshold: 0.65,
      adaptations: ['Complex problems', 'Minimal guidance', 'Time pressure']
    },
    {
      level: 5,
      name: 'Expert',
      description: 'Mastery-level challenges',
      cognitiveThreshold: 0.7,
      performanceThreshold: 0.6,
      adaptations: ['Advanced content', 'No hints', 'Strict timing']
    }
  ];

  useEffect(() => {
    if (isAdaptiveMode) {
      const interval = setInterval(updateAdaptiveDifficulty, 2000);
      return () => clearInterval(interval);
    }
  }, [isAdaptiveMode, adaptationSettings]);

  const updateAdaptiveDifficulty = () => {
    const cognitiveState = bciService.getCurrentCognitiveState();
    if (!cognitiveState) return;

    const newTargetDifficulty = calculateOptimalDifficulty(cognitiveState);
    const adaptationRate = calculateAdaptationRate(newTargetDifficulty);
    
    const newDifficulty = adaptDifficulty(metrics.currentDifficulty, newTargetDifficulty, adaptationRate);
    
    const performanceData = generatePerformanceData(newDifficulty, cognitiveState);
    
    setMetrics(prev => ({
      ...prev,
      currentDifficulty: newDifficulty,
      targetDifficulty: newTargetDifficulty,
      adaptationRate,
      performanceScore: calculatePerformanceScore(performanceHistory),
      cognitiveEfficiency: calculateCognitiveEfficiency(cognitiveState),
      learningVelocity: calculateLearningVelocity(performanceHistory),
      difficultyHistory: [...prev.difficultyHistory.slice(-19), newDifficulty]
    }));

    setPerformanceHistory(prev => [...prev.slice(-49), performanceData]);
  };

  const calculateOptimalDifficulty = (cognitiveState: CognitiveState): number => {
    const { cognitiveWeight, performanceWeight, minDifficulty, maxDifficulty } = adaptationSettings;
    
    const cognitiveScore = (1 - cognitiveState.cognitiveLoad) * cognitiveState.attention;
    const performanceScore = metrics.performanceScore;
    
    const combinedScore = (cognitiveScore * cognitiveWeight) + (performanceScore * performanceWeight);
    
    const targetDifficulty = Math.round(combinedScore * 10);
    
    return Math.max(minDifficulty, Math.min(maxDifficulty, targetDifficulty));
  };

  const calculateAdaptationRate = (targetDifficulty: number): number => {
    const difficulty = Math.abs(targetDifficulty - metrics.currentDifficulty);
    return Math.min(difficulty * adaptationSettings.adaptationSpeed, 1);
  };

  const adaptDifficulty = (current: number, target: number, rate: number): number => {
    const diff = target - current;
    return current + (diff * rate);
  };

  const generatePerformanceData = (difficulty: number, cognitiveState: CognitiveState): PerformanceData => {
    const success = Math.random() > (cognitiveState.cognitiveLoad * difficulty / 10);
    const timeSpent = 30 + Math.random() * 60;
    
    return {
      timestamp: Date.now(),
      difficulty,
      cognitiveLoad: cognitiveState.cognitiveLoad,
      success,
      timeSpent
    };
  };

  const calculatePerformanceScore = (history: PerformanceData[]): number => {
    if (history.length === 0) return 0.5;
    
    const recent = history.slice(-10);
    const successRate = recent.filter(p => p.success).length / recent.length;
    const avgTime = recent.reduce((sum, p) => sum + p.timeSpent, 0) / recent.length;
    const timeScore = Math.max(0, 1 - (avgTime - 30) / 60);
    
    return (successRate * 0.7) + (timeScore * 0.3);
  };

  const calculateCognitiveEfficiency = (cognitiveState: CognitiveState): number => {
    return (cognitiveState.attention + cognitiveState.engagement - cognitiveState.cognitiveLoad) / 2;
  };

  const calculateLearningVelocity = (history: PerformanceData[]): number => {
    if (history.length < 5) return 0.5;
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    const recentPerformance = recent.filter(p => p.success).length / recent.length;
    const olderPerformance = older.filter(p => p.success).length / older.length;
    
    return Math.max(0, Math.min(1, recentPerformance - olderPerformance + 0.5));
  };

  const getCurrentDifficultyLevel = (): DifficultyLevel => {
    const level = Math.min(Math.max(Math.round(metrics.currentDifficulty), 1), 5);
    return difficultyLevels[level - 1];
  };

  const getDifficultyColor = (difficulty: number): string => {
    if (difficulty <= 2) return 'text-green-600 bg-green-50';
    if (difficulty <= 4) return 'text-yellow-600 bg-yellow-50';
    if (difficulty <= 6) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 0.8) return 'text-green-600';
    if (efficiency >= 0.6) return 'text-yellow-600';
    if (efficiency >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const toggleAdaptiveMode = () => {
    setIsAdaptiveMode(!isAdaptiveMode);
    if (!isAdaptiveMode) {
      setMetrics(prev => ({ ...prev, currentDifficulty: manualDifficulty }));
    }
  };

  const updateManualDifficulty = (newDifficulty: number) => {
    setManualDifficulty(newDifficulty);
    if (!isAdaptiveMode) {
      setMetrics(prev => ({ ...prev, currentDifficulty: newDifficulty }));
    }
  };

  const updateAdaptationSettings = (setting: string, value: number) => {
    setAdaptationSettings(prev => ({ ...prev, [setting]: value }));
  };

  const formatChartData = () => {
    return performanceHistory.slice(-20).map((data, index) => ({
      time: index,
      difficulty: data.difficulty * 10,
      cognitiveLoad: data.cognitiveLoad * 100,
      performance: data.success ? 100 : 0
    }));
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Adaptive Difficulty System</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAdaptiveMode}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isAdaptiveMode 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {isAdaptiveMode ? 'Adaptive Mode' : 'Manual Mode'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${getDifficultyColor(metrics.currentDifficulty)}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Current Difficulty</span>
            <Target className="w-5 h-5" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {getCurrentDifficultyLevel().name}
          </div>
          <div className="text-sm mt-1">
            Level {Math.round(metrics.currentDifficulty)}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">Performance Score</span>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-2">
            {(metrics.performanceScore * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-blue-600 mt-1">
            Learning Velocity: {(metrics.learningVelocity * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">Cognitive Efficiency</span>
            <Zap className="w-5 h-5 text-green-600" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${getEfficiencyColor(metrics.cognitiveEfficiency)}`}>
            {(metrics.cognitiveEfficiency * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-600 mt-1">
            {metrics.cognitiveEfficiency >= 0.8 ? 'Optimal' :
             metrics.cognitiveEfficiency >= 0.6 ? 'Good' :
             metrics.cognitiveEfficiency >= 0.4 ? 'Fair' : 'Needs Improvement'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Difficulty Adaptation</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">Manual Difficulty</span>
                <span className="text-sm text-gray-500">{manualDifficulty}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={manualDifficulty}
                onChange={(e) => updateManualDifficulty(parseInt(e.target.value))}
                disabled={isAdaptiveMode}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Cognitive Weight</span>
                <div className="text-lg font-semibold">{(adaptationSettings.cognitiveWeight * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Performance Weight</span>
                <div className="text-lg font-semibold">{(adaptationSettings.performanceWeight * 100).toFixed(0)}%</div>
              </div>
            </div>

            {isAdaptiveMode && (
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span className="text-purple-700 font-medium">Adaptation Active</span>
                </div>
                <div className="text-sm text-purple-600">
                  Target: Level {Math.round(metrics.targetDifficulty)}
                </div>
                <div className="text-sm text-purple-600">
                  Rate: {(metrics.adaptationRate * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Adaptations</h3>
          <div className="space-y-2">
            {getCurrentDifficultyLevel().adaptations.map((adaptation, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">{adaptation}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">Description</h4>
            <p className="text-sm text-blue-600">
              {getCurrentDifficultyLevel().description}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Recent Performance</h4>
            <div className="space-y-2">
              {performanceHistory.slice(-5).reverse().map((data, index) => (
                <div key={`${data.timestamp}-${index}`} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Level {data.difficulty}</span>
                  <span className={data.success ? 'text-green-600' : 'text-red-600'}>
                    {data.success ? 'Success' : 'Failed'}
                  </span>
                  <span className="text-gray-500">{data.timeSpent.toFixed(0)}s</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-2">Difficulty Trend</h4>
            <div className="space-y-1">
              {metrics.difficultyHistory.slice(-10).map((difficulty, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-600 rounded-full" />
                  <span className="text-sm text-gray-600">Level {difficulty.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Settings className="w-5 h-5 text-purple-600 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-purple-800">How Adaptive Difficulty Works</h3>
            <ul className="text-purple-600 text-sm mt-2 space-y-1">
              <li>• Monitors your cognitive load and attention in real-time</li>
              <li>• Adjusts difficulty based on your performance and mental state</li>
              <li>• Balances challenge with cognitive capacity</li>
              <li>• Optimizes learning efficiency and retention</li>
              <li>• Provides personalized content adaptations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
