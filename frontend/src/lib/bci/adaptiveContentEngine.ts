import { CognitiveState } from './bciService';

export interface ContentItem {
  id: string;
  type: 'text' | 'video' | 'interactive' | 'quiz' | 'exercise';
  title: string;
  content: string;
  difficulty: number;
  estimatedTime: number;
  cognitiveRequirements: {
    attention: number;
    engagement: number;
    cognitiveLoad: number;
  };
  adaptations: ContentAdaptation[];
}

export interface ContentAdaptation {
  type: 'simplify' | 'enhance' | 'pace' | 'format' | 'support';
  description: string;
  trigger: {
    metric: keyof CognitiveState;
    threshold: number;
    operator: 'less' | 'greater' | 'equal';
  };
  action: (content: ContentItem) => ContentItem;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  content: ContentItem[];
  prerequisites: string[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface AdaptiveSession {
  id: string;
  learningPathId: string;
  startTime: number;
  currentContent: ContentItem | null;
  completedContent: string[];
  cognitiveHistory: CognitiveState[];
  adaptations: string[];
  performance: {
    accuracy: number;
    timeSpent: number;
    engagement: number;
  };
}

export class AdaptiveContentEngine {
  private contentLibrary: ContentItem[] = [];
  private learningPaths: LearningPath[] = [];
  private activeSessions: Map<string, AdaptiveSession> = new Map();

  constructor() {
    this.initializeContentLibrary();
    this.initializeLearningPaths();
  }

  private initializeContentLibrary(): void {
    this.contentLibrary = [
      {
        id: 'intro_basics',
        type: 'text',
        title: 'Introduction to Basics',
        content: 'This is the foundational content for beginners...',
        difficulty: 1,
        estimatedTime: 300,
        cognitiveRequirements: {
          attention: 0.4,
          engagement: 0.3,
          cognitiveLoad: 0.3
        },
        adaptations: [
          {
            type: 'simplify',
            description: 'Simplify language and add more examples',
            trigger: { metric: 'attention', threshold: 0.3, operator: 'less' },
            action: (content) => ({
              ...content,
              content: content.content.replace(/\b\w{10,}\b/g, (word) => word.slice(0, 6) + '...'),
              difficulty: Math.max(1, content.difficulty - 1)
            })
          },
          {
            type: 'enhance',
            description: 'Add more detailed explanations',
            trigger: { metric: 'engagement', threshold: 0.8, operator: 'greater' },
            action: (content) => ({
              ...content,
              content: content.content + '\n\nAdditional details and context...',
              difficulty: Math.min(10, content.difficulty + 1)
            })
          }
        ]
      },
      {
        id: 'interactive_exercise',
        type: 'interactive',
        title: 'Interactive Practice',
        content: 'Hands-on exercise to apply concepts...',
        difficulty: 3,
        estimatedTime: 600,
        cognitiveRequirements: {
          attention: 0.6,
          engagement: 0.7,
          cognitiveLoad: 0.5
        },
        adaptations: [
          {
            type: 'pace',
            description: 'Adjust pacing based on cognitive load',
            trigger: { metric: 'cognitiveLoad', threshold: 0.7, operator: 'greater' },
            action: (content) => ({
              ...content,
              estimatedTime: content.estimatedTime * 1.5,
              content: content.content + '\n\nTake your time with this exercise...'
            })
          },
          {
            type: 'support',
            description: 'Provide additional hints and guidance',
            trigger: { metric: 'attention', threshold: 0.4, operator: 'less' },
            action: (content) => ({
              ...content,
              content: content.content + '\n\nHint: Start by breaking down the problem...',
              difficulty: Math.max(1, content.difficulty - 1)
            })
          }
        ]
      },
      {
        id: 'advanced_concept',
        type: 'video',
        title: 'Advanced Concepts',
        content: 'In-depth exploration of complex topics...',
        difficulty: 7,
        estimatedTime: 900,
        cognitiveRequirements: {
          attention: 0.8,
          engagement: 0.6,
          cognitiveLoad: 0.7
        },
        adaptations: [
          {
            type: 'format',
            description: 'Change format based on engagement',
            trigger: { metric: 'engagement', threshold: 0.4, operator: 'less' },
            action: (content) => ({
              ...content,
              type: 'interactive',
              content: 'Interactive version of the advanced concepts...',
              estimatedTime: content.estimatedTime * 0.8
            })
          }
        ]
      }
    ];
  }

  private initializeLearningPaths(): void {
    this.learningPaths = [
      {
        id: 'beginner_path',
        name: 'Beginner Learning Path',
        description: 'Start your journey with foundational concepts',
        content: this.contentLibrary.filter(item => item.difficulty <= 3),
        prerequisites: [],
        estimatedDuration: 1800,
        difficulty: 'beginner'
      },
      {
        id: 'intermediate_path',
        name: 'Intermediate Learning Path',
        description: 'Build on your foundation with intermediate topics',
        content: this.contentLibrary.filter(item => item.difficulty >= 3 && item.difficulty <= 6),
        prerequisites: ['beginner_path'],
        estimatedDuration: 2400,
        difficulty: 'intermediate'
      },
      {
        id: 'advanced_path',
        name: 'Advanced Learning Path',
        description: 'Master complex concepts and advanced techniques',
        content: this.contentLibrary.filter(item => item.difficulty >= 6),
        prerequisites: ['intermediate_path'],
        estimatedDuration: 3600,
        difficulty: 'advanced'
      }
    ];
  }

  startLearningSession(learningPathId: string, userId: string): string {
    const sessionId = `${userId}-${Date.now()}`;
    const learningPath = this.learningPaths.find(path => path.id === learningPathId);
    
    if (!learningPath) {
      throw new Error('Learning path not found');
    }

    const session: AdaptiveSession = {
      id: sessionId,
      learningPathId,
      startTime: Date.now(),
      currentContent: null,
      completedContent: [],
      cognitiveHistory: [],
      adaptations: [],
      performance: {
        accuracy: 0,
        timeSpent: 0,
        engagement: 0
      }
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  getNextContent(sessionId: string, cognitiveState: CognitiveState): ContentItem | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.cognitiveHistory.push(cognitiveState);

    const learningPath = this.learningPaths.find(path => path.id === session.learningPathId);
    if (!learningPath) return null;

    const availableContent = learningPath.content.filter(
      item => !session.completedContent.includes(item.id)
    );

    if (availableContent.length === 0) return null;

    const bestContent = this.selectBestContent(availableContent, cognitiveState, session);
    const adaptedContent = this.adaptContent(bestContent, cognitiveState);

    session.currentContent = adaptedContent;
    return adaptedContent;
  }

  private selectBestContent(
    availableContent: ContentItem[],
    cognitiveState: CognitiveState,
    session: AdaptiveSession
  ): ContentItem {
    const scored = availableContent.map(content => ({
      content,
      score: this.calculateContentScore(content, cognitiveState, session)
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored[0].content;
  }

  private calculateContentScore(
    content: ContentItem,
    cognitiveState: CognitiveState,
    session: AdaptiveSession
  ): number {
    let score = 0;

    const attentionMatch = 1 - Math.abs(
      cognitiveState.attention - content.cognitiveRequirements.attention
    );
    const engagementMatch = 1 - Math.abs(
      cognitiveState.engagement - content.cognitiveRequirements.engagement
    );
    const cognitiveLoadMatch = 1 - Math.abs(
      cognitiveState.cognitiveLoad - content.cognitiveRequirements.cognitiveLoad
    );

    score += attentionMatch * 0.4;
    score += engagementMatch * 0.3;
    score += cognitiveLoadMatch * 0.3;

    const difficultyScore = this.calculateDifficultyScore(content, cognitiveState);
    score += difficultyScore * 0.2;

    const timeEfficiency = this.calculateTimeEfficiency(content, session);
    score += timeEfficiency * 0.1;

    return score;
  }

  private calculateDifficultyScore(content: ContentItem, cognitiveState: CognitiveState): number {
    const optimalDifficulty = (cognitiveState.attention + cognitiveState.engagement - cognitiveState.cognitiveLoad) * 5;
    return 1 - Math.abs(content.difficulty - optimalDifficulty) / 10;
  }

  private calculateTimeEfficiency(content: ContentItem, session: AdaptiveSession): number {
    const avgSessionTime = session.performance.timeSpent / Math.max(1, session.completedContent.length);
    const timeRatio = content.estimatedTime / Math.max(avgSessionTime, 1);
    return Math.max(0, 1 - Math.abs(timeRatio - 1));
  }

  private adaptContent(content: ContentItem, cognitiveState: CognitiveState): ContentItem {
    let adaptedContent = { ...content };

    for (const adaptation of content.adaptations) {
      const shouldApply = this.evaluateAdaptationTrigger(adaptation.trigger, cognitiveState);
      
      if (shouldApply) {
        adaptedContent = adaptation.action(adaptedContent);
      }
    }

    return adaptedContent;
  }

  private evaluateAdaptationTrigger(
    trigger: ContentAdaptation['trigger'],
    cognitiveState: CognitiveState
  ): boolean {
    const value = cognitiveState[trigger.metric];
    
    switch (trigger.operator) {
      case 'less':
        return value < trigger.threshold;
      case 'greater':
        return value > trigger.threshold;
      case 'equal':
        return Math.abs(value - trigger.threshold) < 0.1;
      default:
        return false;
    }
  }

  completeContent(sessionId: string, contentId: string, performance: { accuracy: number; timeSpent: number }): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.completedContent.push(contentId);
    session.performance.accuracy = (session.performance.accuracy + performance.accuracy) / 2;
    session.performance.timeSpent += performance.timeSpent;
    
    const recentEngagement = session.cognitiveHistory.slice(-5);
    session.performance.engagement = recentEngagement.reduce(
      (sum, state) => sum + state.engagement, 0
    ) / recentEngagement.length;
  }

  getSessionProgress(sessionId: string): {
    completed: number;
    total: number;
    percentage: number;
    estimatedTimeRemaining: number;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const learningPath = this.learningPaths.find(path => path.id === session.learningPathId);
    if (!learningPath) return null;

    const completed = session.completedContent.length;
    const total = learningPath.content.length;
    const percentage = (completed / total) * 100;

    const avgTimePerContent = session.performance.timeSpent / Math.max(1, completed);
    const remainingContent = total - completed;
    const estimatedTimeRemaining = remainingContent * avgTimePerContent;

    return {
      completed,
      total,
      percentage,
      estimatedTimeRemaining
    };
  }

  getRecommendations(sessionId: string): ContentItem[] {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const currentCognitiveState = session.cognitiveHistory[session.cognitiveHistory.length - 1];
    if (!currentCognitiveState) return [];

    const learningPath = this.learningPaths.find(path => path.id === session.learningPathId);
    if (!learningPath) return [];

    const availableContent = learningPath.content.filter(
      item => !session.completedContent.includes(item.id)
    );

    return availableContent
      .map(content => ({
        content,
        score: this.calculateContentScore(content, currentCognitiveState, session)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.content);
  }

  getLearningAnalytics(sessionId: string): {
    totalSessionTime: number;
    averageEngagement: number;
    averageCognitiveLoad: number;
    adaptationFrequency: number;
    learningEfficiency: number;
  } | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const totalSessionTime = Date.now() - session.startTime;
    const averageEngagement = session.cognitiveHistory.reduce(
      (sum, state) => sum + state.engagement, 0
    ) / session.cognitiveHistory.length;
    const averageCognitiveLoad = session.cognitiveHistory.reduce(
      (sum, state) => sum + state.cognitiveLoad, 0
    ) / session.cognitiveHistory.length;
    const adaptationFrequency = session.adaptations.length / Math.max(1, session.completedContent.length);
    const learningEfficiency = session.performance.accuracy * (1 - averageCognitiveLoad);

    return {
      totalSessionTime,
      averageEngagement,
      averageCognitiveLoad,
      adaptationFrequency,
      learningEfficiency
    };
  }

  getAllLearningPaths(): LearningPath[] {
    return this.learningPaths;
  }

  getContentById(contentId: string): ContentItem | null {
    return this.contentLibrary.find(item => item.id === contentId) || null;
  }

  updateContent(contentId: string, updates: Partial<ContentItem>): boolean {
    const index = this.contentLibrary.findIndex(item => item.id === contentId);
    if (index === -1) return false;

    this.contentLibrary[index] = { ...this.contentLibrary[index], ...updates };
    return true;
  }

  addCustomContent(content: Omit<ContentItem, 'id'>): string {
    const id = `custom_${Date.now()}`;
    this.contentLibrary.push({ ...content, id });
    return id;
  }
}

export const adaptiveContentEngine = new AdaptiveContentEngine();
