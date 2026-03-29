import React, { useState, useEffect } from 'react';
import { Brain, Play, Pause, RotateCcw, Trophy, Target, Zap, Activity, Award, TrendingUp } from 'lucide-react';
import { bciService, CognitiveState } from '../../lib/bci/bciService';

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetMetrics: {
    attention: number;
    relaxation: number;
    engagement: number;
  };
  exercises: TrainingExercise[];
}

interface TrainingExercise {
  id: string;
  name: string;
  type: 'focus' | 'relaxation' | 'engagement' | 'cognitive_control';
  duration: number;
  instructions: string[];
  targetState: Partial<CognitiveState>;
}

interface TrainingSession {
  id: string;
  moduleId: string;
  startTime: number;
  endTime?: number;
  currentExercise?: string;
  progress: number;
  scores: {
    attention: number;
    relaxation: number;
    engagement: number;
    overall: number;
  };
  completed: boolean;
}

interface TrainingProgress {
  totalSessions: number;
  completedModules: string[];
  averageScores: {
    attention: number;
    relaxation: number;
    engagement: number;
    overall: number;
  };
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export const NeurofeedbackTraining: React.FC = () => {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [currentSession, setCurrentSession] = useState<TrainingSession | null>(null);
  const [progress, setProgress] = useState<TrainingProgress>({
    totalSessions: 0,
    completedModules: [],
    averageScores: { attention: 0, relaxation: 0, engagement: 0, overall: 0 },
    skillLevel: 'beginner',
    achievements: []
  });
  const [isTraining, setIsTraining] = useState(false);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  useEffect(() => {
    initializeTrainingModules();
    loadTrainingProgress();
  }, []);

  useEffect(() => {
    if (isTraining && currentSession) {
      const interval = setInterval(updateTrainingSession, 1000);
      return () => clearInterval(interval);
    }
  }, [isTraining, currentSession]);

  const initializeTrainingModules = () => {
    const trainingModules: TrainingModule[] = [
      {
        id: 'focus_foundation',
        name: 'Focus Foundation',
        description: 'Learn to maintain sustained attention and concentration',
        duration: 600,
        difficulty: 'beginner',
        targetMetrics: { attention: 0.7, relaxation: 0.4, engagement: 0.6 },
        exercises: [
          {
            id: 'breathing_focus',
            name: 'Breathing Focus',
            type: 'focus',
            duration: 120,
            instructions: [
              'Focus on your breathing pattern',
              'Maintain steady attention on breath',
              'Notice when mind wanders and gently return'
            ],
            targetState: { attention: 0.6, relaxation: 0.5 }
          },
          {
            id: 'visual_focus',
            name: 'Visual Concentration',
            type: 'focus',
            duration: 180,
            instructions: [
              'Fix your gaze on a central point',
              'Maintain focus without straining',
              'Keep attention steady and relaxed'
            ],
            targetState: { attention: 0.7, relaxation: 0.4 }
          }
        ]
      },
      {
        id: 'relaxation_mastery',
        name: 'Relaxation Mastery',
        description: 'Develop deep relaxation and stress reduction techniques',
        duration: 480,
        difficulty: 'intermediate',
        targetMetrics: { attention: 0.4, relaxation: 0.8, engagement: 0.3 },
        exercises: [
          {
            id: 'progressive_relaxation',
            name: 'Progressive Relaxation',
            type: 'relaxation',
            duration: 240,
            instructions: [
              'Systematically relax muscle groups',
              'Release tension throughout body',
              'Achieve deep state of calm'
            ],
            targetState: { attention: 0.3, relaxation: 0.8 }
          },
          {
            id: 'mindful_relaxation',
            name: 'Mindful Relaxation',
            type: 'relaxation',
            duration: 180,
            instructions: [
              'Practice mindfulness meditation',
              'Observe thoughts without judgment',
              'Maintain peaceful awareness'
            ],
            targetState: { attention: 0.4, relaxation: 0.7 }
          }
        ]
      },
      {
        id: 'cognitive_control',
        name: 'Cognitive Control',
        description: 'Advanced techniques for mental flexibility and control',
        duration: 720,
        difficulty: 'advanced',
        targetMetrics: { attention: 0.6, relaxation: 0.6, engagement: 0.7 },
        exercises: [
          {
            id: 'state_switching',
            name: 'State Switching',
            type: 'cognitive_control',
            duration: 300,
            instructions: [
              'Practice switching between focus and relaxation',
              'Maintain control over mental states',
              'Develop cognitive flexibility'
            ],
            targetState: { attention: 0.6, relaxation: 0.6 }
          },
          {
            id: 'sustained_engagement',
            name: 'Sustained Engagement',
            type: 'engagement',
            duration: 240,
            instructions: [
              'Maintain high engagement levels',
              'Stay motivated and interested',
              'Sustain mental energy'
            ],
            targetState: { attention: 0.7, engagement: 0.8 }
          }
        ]
      }
    ];

    setModules(trainingModules);
  };

  const loadTrainingProgress = () => {
    const savedProgress = localStorage.getItem('neurofeedback_progress');
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  };

  const saveTrainingProgress = (newProgress: TrainingProgress) => {
    setProgress(newProgress);
    localStorage.setItem('neurofeedback_progress', JSON.stringify(newProgress));
  };

  const startTraining = (module: TrainingModule) => {
    if (!bciService.isDeviceConnected()) {
      alert('Please connect a BCI device first');
      return;
    }

    const session: TrainingSession = {
      id: Date.now().toString(),
      moduleId: module.id,
      startTime: Date.now(),
      progress: 0,
      scores: { attention: 0, relaxation: 0, engagement: 0, overall: 0 },
      completed: false
    };

    setCurrentSession(session);
    setIsTraining(true);
    setSelectedModule(module);
  };

  const stopTraining = () => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: Date.now(),
        completed: true
      };

      updateProgress(completedSession);
      setCurrentSession(null);
      setIsTraining(false);
      setSelectedModule(null);
    }
  };

  const pauseTraining = () => {
    setIsTraining(!isTraining);
  };

  const resetTraining = () => {
    setCurrentSession(null);
    setIsTraining(false);
    setSelectedModule(null);
  };

  const updateTrainingSession = () => {
    if (!currentSession || !selectedModule) return;

    const cognitiveState = bciService.getCurrentCognitiveState();
    if (!cognitiveState) return;

    const currentExercise = selectedModule.exercises[0];
    const targetState = currentExercise.targetState;

    const scores = calculateExerciseScores(cognitiveState, targetState);
    const progress = calculateSessionProgress(currentSession, selectedModule);

    setCurrentSession(prev => prev ? {
      ...prev,
      progress,
      scores
    } : null);
  };

  const calculateExerciseScores = (current: CognitiveState, target: Partial<CognitiveState>) => {
    const attentionScore = target.attention ? 1 - Math.abs(current.attention - target.attention) : 0;
    const relaxationScore = target.relaxation ? 1 - Math.abs(current.relaxation - target.relaxation) : 0;
    const engagementScore = target.engagement ? 1 - Math.abs(current.engagement - target.engagement) : 0;
    const overallScore = (attentionScore + relaxationScore + engagementScore) / 3;

    return {
      attention: Math.max(0, attentionScore),
      relaxation: Math.max(0, relaxationScore),
      engagement: Math.max(0, engagementScore),
      overall: Math.max(0, overallScore)
    };
  };

  const calculateSessionProgress = (session: TrainingSession, module: TrainingModule): number => {
    const elapsed = Date.now() - session.startTime;
    return Math.min(100, (elapsed / module.duration) * 100);
  };

  const updateProgress = (completedSession: TrainingSession) => {
    const newProgress = { ...progress };
    newProgress.totalSessions++;

    if (!newProgress.completedModules.includes(completedSession.moduleId)) {
      newProgress.completedModules.push(completedSession.moduleId);
    }

    const totalSessions = newProgress.totalSessions;
    const currentAvg = newProgress.averageScores;
    const sessionScores = completedSession.scores;

    newProgress.averageScores = {
      attention: (currentAvg.attention * (totalSessions - 1) + sessionScores.attention) / totalSessions,
      relaxation: (currentAvg.relaxation * (totalSessions - 1) + sessionScores.relaxation) / totalSessions,
      engagement: (currentAvg.engagement * (totalSessions - 1) + sessionScores.engagement) / totalSessions,
      overall: (currentAvg.overall * (totalSessions - 1) + sessionScores.overall) / totalSessions
    };

    newProgress.skillLevel = determineSkillLevel(newProgress.averageScores.overall);
    newProgress.achievements = checkAchievements(newProgress);

    saveTrainingProgress(newProgress);
  };

  const determineSkillLevel = (overallScore: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
    if (overallScore >= 0.8) return 'expert';
    if (overallScore >= 0.6) return 'advanced';
    if (overallScore >= 0.4) return 'intermediate';
    return 'beginner';
  };

  const checkAchievements = (progress: TrainingProgress): Achievement[] => {
    const achievements: Achievement[] = [
      {
        id: 'first_session',
        name: 'First Steps',
        description: 'Complete your first training session',
        icon: '🎯',
        unlocked: progress.totalSessions >= 1,
        unlockedAt: progress.totalSessions >= 1 ? Date.now() : undefined
      },
      {
        id: 'focus_master',
        name: 'Focus Master',
        description: 'Achieve 80% attention score',
        icon: '🧠',
        unlocked: progress.averageScores.attention >= 0.8,
        unlockedAt: progress.averageScores.attention >= 0.8 ? Date.now() : undefined
      },
      {
        id: 'relaxation_expert',
        name: 'Relaxation Expert',
        description: 'Achieve 80% relaxation score',
        icon: '🧘',
        unlocked: progress.averageScores.relaxation >= 0.8,
        unlockedAt: progress.averageScores.relaxation >= 0.8 ? Date.now() : undefined
      },
      {
        id: 'consistent_learner',
        name: 'Consistent Learner',
        description: 'Complete 10 training sessions',
        icon: '📚',
        unlocked: progress.totalSessions >= 10,
        unlockedAt: progress.totalSessions >= 10 ? Date.now() : undefined
      }
    ];

    return achievements;
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-50';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50';
      case 'advanced': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="w-8 h-8 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Neurofeedback Training</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-yellow-600" />
          <span className="text-gray-600 font-medium">{progress.skillLevel}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-600 font-medium">Sessions</span>
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-2">
            {progress.totalSessions}
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-green-600 font-medium">Attention</span>
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${getScoreColor(progress.averageScores.attention)}`}>
            {(progress.averageScores.attention * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-purple-600 font-medium">Relaxation</span>
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${getScoreColor(progress.averageScores.relaxation)}`}>
            {(progress.averageScores.relaxation * 100).toFixed(1)}%
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-orange-600 font-medium">Overall</span>
            <Award className="w-5 h-5 text-orange-600" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${getScoreColor(progress.averageScores.overall)}`}>
            {(progress.averageScores.overall * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {currentSession && selectedModule && (
        <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-purple-800">Training Session</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={pauseTraining}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {isTraining ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={stopTraining}
                className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-purple-700 mb-2">{selectedModule.name}</h4>
              <p className="text-purple-600 text-sm mb-4">{selectedModule.description}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-purple-600">Progress</span>
                  <span className="text-purple-800 font-medium">{currentSession.progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentSession.progress}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-purple-700 mb-2">Current Scores</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm">
                  <span className="text-purple-600">Attention:</span>
                  <span className={`ml-2 font-medium ${getScoreColor(currentSession.scores.attention)}`}>
                    {(currentSession.scores.attention * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-purple-600">Relaxation:</span>
                  <span className={`ml-2 font-medium ${getScoreColor(currentSession.scores.relaxation)}`}>
                    {(currentSession.scores.relaxation * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-purple-600">Engagement:</span>
                  <span className={`ml-2 font-medium ${getScoreColor(currentSession.scores.engagement)}`}>
                    {(currentSession.scores.engagement * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm">
                  <span className="text-purple-600">Overall:</span>
                  <span className={`ml-2 font-medium ${getScoreColor(currentSession.scores.overall)}`}>
                    {(currentSession.scores.overall * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {selectedModule.exercises[0] && (
            <div className="mt-4 p-3 bg-white rounded-lg">
              <h5 className="font-medium text-gray-800 mb-2">{selectedModule.exercises[0].name}</h5>
              <ul className="text-sm text-gray-600 space-y-1">
                {selectedModule.exercises[0].instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Training Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => {
            const isCompleted = progress.completedModules.includes(module.id);
            const isCurrent = currentSession?.moduleId === module.id;

            return (
              <div
                key={module.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isCurrent ? 'border-purple-600 bg-purple-50' :
                  isCompleted ? 'border-green-600 bg-green-50' :
                  'border-gray-200 bg-white hover:border-purple-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-800">{module.name}</h4>
                  {isCompleted && <Trophy className="w-4 h-4 text-green-600" />}
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(module.duration)}
                  </span>
                </div>

                <button
                  onClick={() => startTraining(module)}
                  disabled={!bciService.isDeviceConnected() || isCurrent || isCompleted}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent ? 'bg-purple-600 text-white' :
                    isCompleted ? 'bg-green-600 text-white' :
                    !bciService.isDeviceConnected() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                    'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isCurrent ? 'In Progress' : isCompleted ? 'Completed' : 'Start Training'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {progress.achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-3 rounded-lg text-center ${
                achievement.unlocked ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-100 opacity-50'
              }`}
            >
              <div className="text-2xl mb-2">{achievement.icon}</div>
              <h4 className="font-medium text-gray-800 text-sm">{achievement.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{achievement.description}</p>
              {achievement.unlocked && (
                <div className="text-xs text-green-600 mt-2">✓ Unlocked</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
