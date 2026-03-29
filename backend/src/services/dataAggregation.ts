/**
 * Data Aggregation Service
 * Handles retrieval and aggregation of learning data from various sources
 */

export class DataAggregationService {
  /**
   * Aggregate completion statistics for a specific course
   */
  static async getCourseCompletionStats(courseId: string) {
    // Simulate DB delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Mock data generation
    const totalEnrolled = Math.floor(Math.random() * 500) + 50;
    const completed = Math.floor(totalEnrolled * (Math.random() * 0.4 + 0.1));
    
    return {
      courseId,
      totalEnrolled,
      activeLearners: Math.floor(totalEnrolled * 0.6),
      averageCompletion: Math.floor(Math.random() * 40) + 40,
      averageQuizScore: Math.floor(Math.random() * 20) + 75,
      completionRate: Math.round((completed / totalEnrolled) * 100),
      timeSpentAverage: Math.floor(Math.random() * 300) + 120, // minutes
      distribution: {
        '0-25%': Math.floor(totalEnrolled * 0.2),
        '26-50%': Math.floor(totalEnrolled * 0.3),
        '51-75%': Math.floor(totalEnrolled * 0.3),
        '76-100%': Math.floor(totalEnrolled * 0.2)
      }
    };
  }

  /**
   * Get daily activity metrics for a user
   */
  static async getUserDailyActivity(userId: string, days: number) {
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const activity = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Randomize activity
      const hasActivity = Math.random() > 0.3;
      
      activity.push({
        date: date.toISOString().split('T')[0],
        lessons_completed: hasActivity ? Math.floor(Math.random() * 4) : 0,
        time_spent: hasActivity ? Math.floor(Math.random() * 90) + 10 : 0,
        quiz_score: hasActivity && Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 70 : 0
      });
    }
    
    return activity;
  }

  /**
   * Get detailed time analysis for a user
   */
  static async getUserTimeAnalysis(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      totalTime: 1245, // minutes
      avgSessionDuration: 42,
      timeByCourse: [
        { name: 'Stellar Basics', value: 450 },
        { name: 'Smart Contracts', value: 320 },
        { name: 'Frontend Integration', value: 280 },
        { name: 'Security', value: 195 }
      ],
      timeByDay: [
        { day: 'Mon', minutes: 45 },
        { day: 'Tue', minutes: 90 },
        { day: 'Wed', minutes: 30 },
        { day: 'Thu', minutes: 120 },
        { day: 'Fri', minutes: 60 },
        { day: 'Sat', minutes: 15 },
        { day: 'Sun', minutes: 0 }
      ],
      mostActiveTime: 'Evening (18:00 - 21:00)'
    };
  }

  /**
   * Get user's course completion status for reports
   */
  static async getUserCourseCompletion(userId: string) {
    await new Promise(resolve => setTimeout(resolve, 50));

    return [
      { 
        courseId: 'c101', 
        title: 'Introduction to Blockchain', 
        progress: 100, 
        score: 92, 
        status: 'completed',
        completedAt: new Date(Date.now() - 86400000 * 10).toISOString()
      },
      { 
        courseId: 'c102', 
        title: 'Stellar Consensus Protocol', 
        progress: 65, 
        score: 85, 
        status: 'in_progress',
        lastAccessed: new Date(Date.now() - 86400000 * 1).toISOString()
      },
      { 
        courseId: 'c103', 
        title: 'Soroban Smart Contracts', 
        progress: 15, 
        score: 0, 
        status: 'in_progress',
        lastAccessed: new Date(Date.now() - 86400000 * 5).toISOString()
      }
    ];
  }

  /**
   * Get aggregate performance for a quiz
   */
  static async getQuizPerformanceAnalytics(quizId: string) {
    await new Promise(resolve => setTimeout(resolve, 50));

    return {
      quizId,
      totalSubmissions: 150 + Math.floor(Math.random() * 50),
      averageScore: 78 + (Math.random() * 10),
      passRate: 85,
      questionDifficulty: [
        { questionId: 'q1', text: 'Stellar Basics', difficulty: 0.15, correctRate: 0.85 },
        { questionId: 'q2', text: 'Consensus Logic', difficulty: 0.45, correctRate: 0.55 },
        { questionId: 'q3', text: 'Horizon API', difficulty: 0.25, correctRate: 0.75 }
      ],
      scoreDistribution: [
        { range: '0-20', count: 5 },
        { range: '21-40', count: 12 },
        { range: '41-60', count: 28 },
        { range: '61-80', count: 65 },
        { range: '81-100', count: 40 }
      ],
      learningOutcomes: [
        { outcome: 'Stellar Fundamentals', score: 88, weight: 40 },
        { outcome: 'Operational Security', score: 72, weight: 30 },
        { outcome: 'API Integration', score: 82, weight: 30 }
      ]
    };
  }
}