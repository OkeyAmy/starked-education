'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Target, Zap, Brain, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { LearningStyle } from './LearningStyleDetector';

export type DifficultyLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced' | 'expert' | 'master';
export type AdjustmentStrategy = 'gradual' | 'adaptive' | 'aggressive' | 'conservative';

interface PerformanceMetrics {
  accuracy: number;
  completionTime: number;
  helpRequests: number;
  attempts: number;
  engagement: number;
  retention: number;
  frustration: number;
  confidence: number;
}

interface DifficultyProfile {
  userId: string;
  currentLevel: DifficultyLevel;
  targetLevel: DifficultyLevel;
  adjustmentStrategy: AdjustmentStrategy;
  performanceHistory: PerformanceDataPoint[];
  adaptationHistory: AdaptationRecord[];
  preferences: {
    challengePreference: 'easy' | 'balanced' | 'challenging';
    learningPace: 'slow' | 'normal' | 'fast';
    feedbackFrequency: 'minimal' | 'regular' | 'frequent';
    hintTolerance: number;
  };
  thresholds: {
    upgradeThreshold: number;
    downgradeThreshold: number;
    adjustmentWindow: number;
    minimumDataPoints: number;
  };
}

interface PerformanceDataPoint {
  timestamp: string;
  activity: string;
  metrics: PerformanceMetrics;
  difficulty: DifficultyLevel;
  outcome: 'success' | 'partial' | 'failure';
  adaptations: string[];
}

interface AdaptationRecord {
  timestamp: string;
  previousLevel: DifficultyLevel;
  newLevel: DifficultyLevel;
  reason: string;
  strategy: AdjustmentStrategy;
  metrics: PerformanceMetrics;
  success: boolean;
  userFeedback?: 'positive' | 'negative' | 'neutral';
}

interface DifficultyAdjustmentEngineProps {
  userId: string;
  learningStyle: LearningStyle;
  onDifficultyChange?: (level: DifficultyLevel, adaptations: any) => void;
  onAdaptationApplied?: (record: AdaptationRecord) => void;
  enableAutoAdjustment?: boolean;
  adjustmentSensitivity?: number;
  showRecommendations?: boolean;
  trackDetailedMetrics?: boolean;
}

const DIFFICULTY_LEVELS: Record<DifficultyLevel, {
  name: string;
  value: number;
  color: string;
  characteristics: {
    complexity: number;
    pacing: number;
    support: number;
    autonomy: number;
  };
  indicators: {
    accuracy: [number, number];
    completionTime: [number, number];
    helpRequests: [number, number];
    attempts: [number, number];
  };
}> = {
  beginner: {
    name: 'Beginner',
    value: 1,
    color: 'green',
    characteristics: {
      complexity: 0.2,
      pacing: 0.3,
      support: 0.9,
      autonomy: 0.1
    },
    indicators: {
      accuracy: [0.8, 1.0],
      completionTime: [300, 600],
      helpRequests: [0, 2],
      attempts: [1, 2]
    }
  },
  elementary: {
    name: 'Elementary',
    value: 2,
    color: 'blue',
    characteristics: {
      complexity: 0.4,
      pacing: 0.5,
      support: 0.7,
      autonomy: 0.3
    },
    indicators: {
      accuracy: [0.7, 0.9],
      completionTime: [240, 480],
      helpRequests: [0, 3],
      attempts: [1, 3]
    }
  },
  intermediate: {
    name: 'Intermediate',
    value: 3,
    color: 'yellow',
    characteristics: {
      complexity: 0.6,
      pacing: 0.6,
      support: 0.5,
      autonomy: 0.5
    },
    indicators: {
      accuracy: [0.6, 0.8],
      completionTime: [180, 360],
      helpRequests: [1, 4],
      attempts: [2, 4]
    }
  },
  advanced: {
    name: 'Advanced',
    value: 4,
    color: 'orange',
    characteristics: {
      complexity: 0.8,
      pacing: 0.7,
      support: 0.3,
      autonomy: 0.7
    },
    indicators: {
      accuracy: [0.5, 0.7],
      completionTime: [120, 300],
      helpRequests: [2, 5],
      attempts: [3, 5]
    }
  },
  expert: {
    name: 'Expert',
    value: 5,
    color: 'red',
    characteristics: {
      complexity: 0.9,
      pacing: 0.8,
      support: 0.2,
      autonomy: 0.8
    },
    indicators: {
      accuracy: [0.4, 0.6],
      completionTime: [60, 240],
      helpRequests: [3, 6],
      attempts: [4, 6]
    }
  },
  master: {
    name: 'Master',
    value: 6,
    color: 'purple',
    characteristics: {
      complexity: 1.0,
      pacing: 0.9,
      support: 0.1,
      autonomy: 0.9
    },
    indicators: {
      accuracy: [0.3, 0.5],
      completionTime: [30, 180],
      helpRequests: [4, 8],
      attempts: [5, 8]
    }
  }
};

const ADJUSTMENT_STRATEGIES: Record<AdjustmentStrategy, {
  name: string;
  description: string;
  aggressiveness: number;
  windowSize: number;
  factors: {
    accuracy: number;
    speed: number;
    engagement: number;
    frustration: number;
  };
}> = {
  gradual: {
    name: 'Gradual',
    description: 'Slow, steady adjustments based on consistent performance',
    aggressiveness: 0.3,
    windowSize: 10,
    factors: { accuracy: 0.4, speed: 0.3, engagement: 0.2, frustration: 0.1 }
  },
  adaptive: {
    name: 'Adaptive',
    description: 'Balanced adjustments responding to performance patterns',
    aggressiveness: 0.5,
    windowSize: 7,
    factors: { accuracy: 0.3, speed: 0.3, engagement: 0.3, frustration: 0.1 }
  },
  aggressive: {
    name: 'Aggressive',
    description: 'Rapid adjustments for quick progression',
    aggressiveness: 0.8,
    windowSize: 5,
    factors: { accuracy: 0.2, speed: 0.4, engagement: 0.3, frustration: 0.1 }
  },
  conservative: {
    name: 'Conservative',
    description: 'Careful adjustments prioritizing confidence',
    aggressiveness: 0.2,
    windowSize: 12,
    factors: { accuracy: 0.5, speed: 0.2, engagement: 0.2, frustration: 0.1 }
  }
};

export function DifficultyAdjustmentEngine({
  userId,
  learningStyle,
  onDifficultyChange,
  onAdaptationApplied,
  enableAutoAdjustment = true,
  adjustmentSensitivity = 0.7,
  showRecommendations = true,
  trackDetailedMetrics = true
}: DifficultyAdjustmentEngineProps) {
  const [profile, setProfile] = useState<DifficultyProfile>({
    userId,
    currentLevel: 'intermediate',
    targetLevel: 'intermediate',
    adjustmentStrategy: 'adaptive',
    performanceHistory: [],
    adaptationHistory: [],
    preferences: {
      challengePreference: 'balanced',
      learningPace: 'normal',
      feedbackFrequency: 'regular',
      hintTolerance: 3
    },
    thresholds: {
      upgradeThreshold: 0.8,
      downgradeThreshold: 0.4,
      adjustmentWindow: 5,
      minimumDataPoints: 3
    }
  });

  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics>({
    accuracy: 0.7,
    completionTime: 300,
    helpRequests: 2,
    attempts: 2,
    engagement: 0.8,
    retention: 0.7,
    frustration: 0.2,
    confidence: 0.7
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [recentAdaptation, setRecentAdaptation] = useState<AdaptationRecord | null>(null);

  // Analyze performance and determine if adjustment is needed
  useEffect(() => {
    if (!enableAutoAdjustment) return;

    const analyzePerformance = () => {
      setIsAnalyzing(true);
      
      const strategy = ADJUSTMENT_STRATEGIES[profile.adjustmentStrategy];
      const recentData = profile.performanceHistory.slice(-strategy.windowSize);
      
      if (recentData.length < profile.thresholds.minimumDataPoints) {
        setIsAnalyzing(false);
        return;
      }

      // Calculate weighted performance score
      const performanceScore = calculatePerformanceScore(recentData, strategy);
      
      // Determine if adjustment is needed
      const currentLevelConfig = DIFFICULTY_LEVELS[profile.currentLevel];
      const shouldUpgrade = performanceScore >= profile.thresholds.upgradeThreshold;
      const shouldDowngrade = performanceScore <= profile.thresholds.downgradeThreshold;

      if (shouldUpgrade && profile.currentLevel !== 'master') {
        const nextLevel = getNextLevel(profile.currentLevel);
        applyDifficultyAdjustment(nextLevel, 'performance-upgrade', performanceScore);
      } else if (shouldDowngrade && profile.currentLevel !== 'beginner') {
        const prevLevel = getPreviousLevel(profile.currentLevel);
        applyDifficultyAdjustment(prevLevel, 'performance-downgrade', performanceScore);
      } else {
        // Generate recommendations for improvement
        generateRecommendations(recentData, performanceScore);
      }

      setTimeout(() => setIsAnalyzing(false), 1000);
    };

    const analysisInterval = setInterval(analyzePerformance, 15000);
    return () => clearInterval(analysisInterval);
  }, [profile, enableAutoAdjustment]);

  // Calculate weighted performance score
  const calculatePerformanceScore = useCallback((
    data: PerformanceDataPoint[], 
    strategy: typeof ADJUSTMENT_STRATEGIES[keyof typeof ADJUSTMENT_STRATEGIES]
  ): number => {
    if (data.length === 0) return 0.5;

    const factors = strategy.factors;
    let totalScore = 0;
    let totalWeight = 0;

    data.forEach(point => {
      const metrics = point.metrics;
      
      // Accuracy component
      const accuracyScore = metrics.accuracy;
      totalScore += accuracyScore * factors.accuracy;
      totalWeight += factors.accuracy;

      // Speed component (inverse of completion time)
      const maxTime = 600; // Maximum expected time in seconds
      const speedScore = Math.max(0, 1 - (metrics.completionTime / maxTime));
      totalScore += speedScore * factors.speed;
      totalWeight += factors.speed;

      // Engagement component
      totalScore += metrics.engagement * factors.engagement;
      totalWeight += factors.engagement;

      // Frustration component (inverse)
      totalScore += (1 - metrics.frustration) * factors.frustration;
      totalWeight += factors.frustration;
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0.5;
  }, []);

  // Get next difficulty level
  const getNextLevel = (current: DifficultyLevel): DifficultyLevel => {
    const levels: DifficultyLevel[] = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert', 'master'];
    const currentIndex = levels.indexOf(current);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : current;
  };

  // Get previous difficulty level
  const getPreviousLevel = (current: DifficultyLevel): DifficultyLevel => {
    const levels: DifficultyLevel[] = ['beginner', 'elementary', 'intermediate', 'advanced', 'expert', 'master'];
    const currentIndex = levels.indexOf(current);
    return currentIndex > 0 ? levels[currentIndex - 1] : current;
  };

  // Apply difficulty adjustment
  const applyDifficultyAdjustment = useCallback((
    newLevel: DifficultyLevel, 
    reason: string, 
    performanceScore: number
  ) => {
    const adaptation: AdaptationRecord = {
      timestamp: new Date().toISOString(),
      previousLevel: profile.currentLevel,
      newLevel,
      reason,
      strategy: profile.adjustmentStrategy,
      metrics: currentMetrics,
      success: true
    };

    setProfile(prev => ({
      ...prev,
      currentLevel: newLevel,
      targetLevel: newLevel,
      adaptationHistory: [...prev.adaptationHistory.slice(-20), adaptation]
    }));

    setRecentAdaptation(adaptation);
    onDifficultyChange?.(newLevel, DIFFICULTY_LEVELS[newLevel].characteristics);
    onAdaptationApplied?.(adaptation);

    // Update content based on new difficulty
    updateContentForDifficulty(newLevel);
  }, [profile.currentLevel, profile.adjustmentStrategy, currentMetrics, onDifficultyChange, onAdaptationApplied]);

  // Update content based on difficulty
  const updateContentForDifficulty = useCallback((level: DifficultyLevel) => {
    const levelConfig = DIFFICULTY_LEVELS[level];
    
    // This would trigger content updates in the parent component
    console.log(`Updating content for ${levelConfig.name} difficulty:`, levelConfig.characteristics);
  }, []);

  // Generate recommendations
  const generateRecommendations = useCallback((data: PerformanceDataPoint[], score: number) => {
    const recommendations: string[] = [];
    const avgMetrics = data.reduce((acc, point) => {
      Object.keys(point.metrics).forEach(key => {
        const metricKey = key as keyof PerformanceMetrics;
        acc[metricKey] = (acc[metricKey] || 0) + point.metrics[metricKey];
      });
      return acc;
    }, {} as Partial<PerformanceMetrics>);

    // Calculate averages
    Object.keys(avgMetrics).forEach(key => {
      const metricKey = key as keyof PerformanceMetrics;
      avgMetrics[metricKey] = (avgMetrics[metricKey] || 0) / data.length;
    });

    // Generate specific recommendations
    if (avgMetrics.accuracy! < 0.6) {
      recommendations.push('Focus on accuracy - consider reviewing fundamentals');
    }
    
    if (avgMetrics.completionTime! > 400) {
      recommendations.push('Try to improve speed - practice with similar problems');
    }
    
    if (avgMetrics.helpRequests! > 3) {
      recommendations.push('Build independence - attempt problems without hints first');
    }
    
    if (avgMetrics.engagement! < 0.7) {
      recommendations.push('Increase engagement - try more interactive exercises');
    }
    
    if (avgMetrics.frustration! > 0.4) {
      recommendations.push('Take breaks when frustrated - return with fresh perspective');
    }

    setRecommendations(recommendations);
  }, []);

  // Record performance data
  const recordPerformance = useCallback((
    activity: string, 
    metrics: PerformanceMetrics, 
    outcome: 'success' | 'partial' | 'failure'
  ) => {
    const dataPoint: PerformanceDataPoint = {
      timestamp: new Date().toISOString(),
      activity,
      metrics,
      difficulty: profile.currentLevel,
      outcome,
      adaptations: []
    };

    setProfile(prev => ({
      ...prev,
      performanceHistory: [...prev.performanceHistory.slice(-50), dataPoint]
    }));

    setCurrentMetrics(metrics);
  }, [profile.currentLevel]);

  // Manual difficulty adjustment
  const setManualDifficulty = useCallback((level: DifficultyLevel) => {
    const adaptation: AdaptationRecord = {
      timestamp: new Date().toISOString(),
      previousLevel: profile.currentLevel,
      newLevel: level,
      reason: 'manual-override',
      strategy: profile.adjustmentStrategy,
      metrics: currentMetrics,
      success: true,
      userFeedback: 'positive'
    };

    setProfile(prev => ({
      ...prev,
      currentLevel: level,
      targetLevel: level,
      adaptationHistory: [...prev.adaptationHistory.slice(-20), adaptation]
    }));

    setRecentAdaptation(adaptation);
    onDifficultyChange?.(level, DIFFICULTY_LEVELS[level].characteristics);
    onAdaptationApplied?.(adaptation);
    updateContentForDifficulty(level);
  }, [profile.currentLevel, profile.adjustmentStrategy, currentMetrics, onDifficultyChange, onAdaptationApplied, updateContentForDifficulty]);

  // Get current level configuration
  const currentLevelConfig = DIFFICULTY_LEVELS[profile.currentLevel];
  const strategyConfig = ADJUSTMENT_STRATEGIES[profile.adjustmentStrategy];

  // Calculate performance indicators
  const performanceIndicators = useMemo(() => {
    const indicators = {
      accuracy: currentMetrics.accuracy >= currentLevelConfig.indicators.accuracy[0] && 
               currentMetrics.accuracy <= currentLevelConfig.indicators.accuracy[1],
      speed: currentMetrics.completionTime >= currentLevelConfig.indicators.completionTime[0] && 
             currentMetrics.completionTime <= currentLevelConfig.indicators.completionTime[1],
      help: currentMetrics.helpRequests >= currentLevelConfig.indicators.helpRequests[0] && 
            currentMetrics.helpRequests <= currentLevelConfig.indicators.helpRequests[1],
      attempts: currentMetrics.attempts >= currentLevelConfig.indicators.attempts[0] && 
                currentMetrics.attempts <= currentLevelConfig.indicators.attempts[1]
    };

    const passedIndicators = Object.values(indicators).filter(Boolean).length;
    const totalIndicators = Object.keys(indicators).length;
    
    return {
      ...indicators,
      score: passedIndicators / totalIndicators,
      passed: passedIndicators,
      total: totalIndicators
    };
  }, [currentMetrics, currentLevelConfig]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Difficulty Adjustment Engine
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {isAnalyzing ? 'Analyzing' : 'Monitoring'}
          </span>
        </div>
      </div>

      {/* Current Difficulty Level */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Current Level
            </div>
            <div className={`text-2xl font-bold text-${currentLevelConfig.color}-600`}>
              {currentLevelConfig.name}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Strategy: {strategyConfig.name}
            </div>
            <div className="text-xs text-blue-500 dark:text-blue-500">
              {strategyConfig.description}
            </div>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(performanceIndicators.score * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full bg-${currentLevelConfig.color}-600`}
              initial={{ width: 0 }}
              animate={{ width: `${performanceIndicators.score * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className={`text-center p-2 rounded ${
            performanceIndicators.accuracy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div>Accuracy</div>
            <div className="font-bold">{Math.round(currentMetrics.accuracy * 100)}%</div>
          </div>
          <div className={`text-center p-2 rounded ${
            performanceIndicators.speed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div>Speed</div>
            <div className="font-bold">{currentMetrics.completionTime}s</div>
          </div>
          <div className={`text-center p-2 rounded ${
            performanceIndicators.help ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div>Help</div>
            <div className="font-bold">{currentMetrics.helpRequests}</div>
          </div>
          <div className={`text-center p-2 rounded ${
            performanceIndicators.attempts ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div>Attempts</div>
            <div className="font-bold">{currentMetrics.attempts}</div>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Performance Metrics</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(currentMetrics.engagement * 100)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Engagement</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(currentMetrics.confidence * 100)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(currentMetrics.retention * 100)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Retention</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(currentMetrics.frustration * 100)}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Frustration</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, index) => (
              <motion.div
                key={index}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    {rec}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Controls */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Manual Adjustment
        </h4>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {Object.entries(DIFFICULTY_LEVELS).map(([level, config]) => (
            <button
              key={level}
              onClick={() => setManualDifficulty(level as DifficultyLevel)}
              className={`p-2 rounded text-xs font-medium transition-colors ${
                profile.currentLevel === level
                  ? `bg-${config.color}-600 text-white`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Adaptation */}
      {recentAdaptation && (
        <motion.div
          className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                  Difficulty Adjusted
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  {recentAdaptation.previousLevel} → {recentAdaptation.newLevel}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400">
                  Reason: {recentAdaptation.reason}
                </div>
              </div>
            </div>
            <button
              onClick={() => setRecentAdaptation(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}

      {/* Adaptation History */}
      {profile.adaptationHistory.length > 0 && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Recent Adaptations
          </h4>
          <div className="space-y-2">
            {profile.adaptationHistory.slice(-3).reverse().map((adaptation, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {new Date(adaptation.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {adaptation.previousLevel} → {adaptation.newLevel}
                  </span>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  adaptation.success 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {adaptation.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
