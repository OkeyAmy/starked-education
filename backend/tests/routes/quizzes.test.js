const request = require('supertest');
const app = require('../../src/index');
const userData = require('../fixtures/userData');

// Mock the quiz controller
jest.mock('../../src/controllers/quizController', () => ({
  default: {
    createQuiz: jest.fn(),
    getQuizzes: jest.fn(),
    getQuizById: jest.fn(),
    updateQuiz: jest.fn(),
    deleteQuiz: jest.fn(),
    toggleQuizPublish: jest.fn(),
    submitQuiz: jest.fn(),
    getUserSubmission: jest.fn(),
    getQuizResults: jest.fn(),
    getQuizStatistics: jest.fn(),
    getGradingStatistics: jest.fn(),
    getSubmissionById: jest.fn(),
    regradeSubmission: jest.fn(),
    healthCheck: jest.fn()
  }
}));

const quizController = require('../../src/controllers/quizController').default;

describe('Quiz API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/quizzes', () => {
    it('should create a new quiz successfully', async () => {
      const mockQuiz = {
        title: 'Blockchain Fundamentals Quiz',
        description: 'Test your knowledge of blockchain basics',
        courseId: 'course_123',
        questions: [
          {
            id: 'q1',
            type: 'multiple-choice',
            question: 'What is a blockchain?',
            options: ['A distributed ledger', 'A cryptocurrency', 'A database', 'A network'],
            correctAnswer: 0,
            points: 10
          }
        ],
        timeLimit: 1800, // 30 minutes
        passingScore: 70,
        randomizeQuestions: true,
        allowRetakes: false
      };
      
      const createdQuiz = { ...mockQuiz, id: 'quiz_123', createdAt: new Date() };
      quizController.createQuiz.mockResolvedValue(createdQuiz);

      const response = await request(app)
        .post('/api/quizzes')
        .send(mockQuiz);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(createdQuiz);
      expect(quizController.createQuiz).toHaveBeenCalledWith(mockQuiz);
    });

    it('should validate quiz creation data', async () => {
      const invalidQuiz = {
        title: '', // empty
        description: 'short', // too short
        questions: [], // empty
        timeLimit: -1 // negative
      };

      quizController.createQuiz.mockRejectedValue(new Error('Invalid quiz data'));

      const response = await request(app)
        .post('/api/quizzes')
        .send(invalidQuiz);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle quiz creation errors', async () => {
      quizController.createQuiz.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/quizzes')
        .send(userData.courses.validCourse);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes', () => {
    it('should retrieve quizzes with pagination', async () => {
      const mockQuizzes = [
        { id: 'quiz_1', title: 'Quiz 1', courseId: 'course_1' },
        { id: 'quiz_2', title: 'Quiz 2', courseId: 'course_2' }
      ];
      const mockResult = {
        quizzes: mockQuizzes,
        total: 2,
        page: 1,
        limit: 10,
        hasMore: false
      };

      quizController.getQuizzes.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/quizzes?page=1&limit=10&courseId=course_1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(quizController.getQuizzes).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        courseId: 'course_1'
      });
    });

    it('should handle empty quiz list', async () => {
      const mockResult = {
        quizzes: [],
        total: 0,
        page: 1,
        limit: 10,
        hasMore: false
      };

      quizController.getQuizzes.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/quizzes');

      expect(response.status).toBe(200);
      expect(response.body.data.quizzes).toEqual([]);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should retrieve specific quiz', async () => {
      const mockQuiz = {
        id: 'quiz_123',
        title: 'Blockchain Quiz',
        questions: [],
        timeLimit: 1800
      };

      quizController.getQuizById.mockResolvedValue(mockQuiz);

      const response = await request(app)
        .get('/api/quizzes/quiz_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockQuiz);
      expect(quizController.getQuizById).toHaveBeenCalledWith('quiz_123');
    });

    it('should handle non-existent quiz', async () => {
      quizController.getQuizById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/quizzes/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should validate quiz ID format', async () => {
      const response = await request(app)
        .get('/api/quizzes/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/quizzes/:id', () => {
    it('should update quiz successfully', async () => {
      const updateData = {
        title: 'Updated Quiz Title',
        timeLimit: 2400
      };
      const updatedQuiz = {
        id: 'quiz_123',
        title: 'Updated Quiz Title',
        timeLimit: 2400,
        updatedAt: new Date()
      };

      quizController.updateQuiz.mockResolvedValue(updatedQuiz);

      const response = await request(app)
        .put('/api/quizzes/quiz_123')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(updatedQuiz);
      expect(quizController.updateQuiz).toHaveBeenCalledWith('quiz_123', updateData);
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        title: 'a', // too short
        timeLimit: -1 // negative
      };

      const response = await request(app)
        .put('/api/quizzes/quiz_123')
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/quizzes/:id', () => {
    it('should delete quiz successfully', async () => {
      quizController.deleteQuiz.mockResolvedValue({ deleted: true });

      const response = await request(app)
        .delete('/api/quizzes/quiz_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(quizController.deleteQuiz).toHaveBeenCalledWith('quiz_123');
    });

    it('should handle quiz deletion errors', async () => {
      quizController.deleteQuiz.mockRejectedValue(new Error('Cannot delete quiz'));

      const response = await request(app)
        .delete('/api/quizzes/quiz_123');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/quizzes/:id/publish', () => {
    it('should publish quiz successfully', async () => {
      const publishedQuiz = {
        id: 'quiz_123',
        title: 'Published Quiz',
        isPublished: true,
        publishedAt: new Date()
      };

      quizController.toggleQuizPublish.mockResolvedValue(publishedQuiz);

      const response = await request(app)
        .post('/api/quizzes/quiz_123/publish');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isPublished).toBe(true);
    });

    it('should unpublish quiz successfully', async () => {
      const unpublishedQuiz = {
        id: 'quiz_123',
        title: 'Unpublished Quiz',
        isPublished: false,
        unpublishedAt: new Date()
      };

      quizController.toggleQuizPublish.mockResolvedValue(unpublishedQuiz);

      const response = await request(app)
        .post('/api/quizzes/quiz_123/publish');

      expect(response.status).toBe(200);
      expect(response.body.data.isPublished).toBe(false);
    });

    it('should handle publish errors', async () => {
      quizController.toggleQuizPublish.mockRejectedValue(new Error('Publish failed'));

      const response = await request(app)
        .post('/api/quizzes/quiz_123/publish');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/quizzes/:id/submit', () => {
    it('should submit quiz successfully', async () => {
      const submissionData = {
        userId: 'user_123',
        answers: [
          { questionId: 'q1', answer: 0 },
          { questionId: 'q2', answer: ' Blockchain is a distributed ledger' }
        ],
        timeSpent: 1500,
        submittedAt: new Date()
      };

      const submissionResult = {
        id: 'submission_123',
        quizId: 'quiz_123',
        userId: 'user_123',
        score: 85,
        totalPoints: 100,
        passed: true,
        submittedAt: new Date(),
        gradedAt: new Date()
      };

      quizController.submitQuiz.mockResolvedValue(submissionResult);

      const response = await request(app)
        .post('/api/quizzes/quiz_123/submit')
        .send(submissionData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(submissionResult);
      expect(quizController.submitQuiz).toHaveBeenCalledWith('quiz_123', submissionData);
    });

    it('should validate submission data', async () => {
      const invalidSubmission = {
        userId: '', // empty
        answers: [], // empty
        timeSpent: -1 // negative
      };

      const response = await request(app)
        .post('/api/quizzes/quiz_123/submit')
        .send(invalidSubmission);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle duplicate submissions', async () => {
      quizController.submitQuiz.mockRejectedValue(new Error('Already submitted'));

      const response = await request(app)
        .post('/api/quizzes/quiz_123/submit')
        .send({ userId: 'user_123', answers: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes/:id/submission', () => {
    it('should retrieve user submission', async () => {
      const mockSubmission = {
        id: 'submission_123',
        quizId: 'quiz_123',
        userId: 'user_123',
        answers: [],
        score: 85,
        submittedAt: new Date()
      };

      quizController.getUserSubmission.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/submission?userId=user_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSubmission);
      expect(quizController.getUserSubmission).toHaveBeenCalledWith('quiz_123', 'user_123');
    });

    it('should handle missing submission', async () => {
      quizController.getUserSubmission.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/submission?userId=user_123');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes/:id/results', () => {
    it('should retrieve quiz results', async () => {
      const mockResults = {
        quizId: 'quiz_123',
        totalSubmissions: 50,
        averageScore: 75.5,
        passRate: 0.8,
        scoreDistribution: {
          '90-100': 10,
          '80-89': 15,
          '70-79': 15,
          '60-69': 8,
          '0-59': 2
        },
        submissions: [
          {
            userId: 'user_1',
            score: 85,
            submittedAt: new Date()
          }
        ]
      };

      quizController.getQuizResults.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/results');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResults);
    });

    it('should handle results with filters', async () => {
      const mockResults = { submissions: [], total: 0 };
      quizController.getQuizResults.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/results?startDate=2024-01-01&endDate=2024-12-31');

      expect(response.status).toBe(200);
      expect(quizController.getQuizResults).toHaveBeenCalledWith('quiz_123', {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });
    });
  });

  describe('GET /api/quizzes/:id/statistics', () => {
    it('should retrieve quiz statistics', async () => {
      const mockStatistics = {
        quizId: 'quiz_123',
        totalAttempts: 100,
        uniqueUsers: 80,
        averageScore: 78.5,
        averageTimeSpent: 1650,
        completionRate: 0.85,
        questionAnalytics: [
          {
            questionId: 'q1',
            correctAnswers: 65,
            incorrectAnswers: 35,
            averageTime: 45
          }
        ]
      };

      quizController.getQuizStatistics.mockResolvedValue(mockStatistics);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatistics);
    });
  });

  describe('GET /api/quizzes/:id/grading-statistics', () => {
    it('should retrieve grading statistics', async () => {
      const mockGradingStats = {
        quizId: 'quiz_123',
        totalGraded: 50,
        pendingGrading: 5,
        averageGradingTime: 300,
        gradeDistribution: {
          'A': 15,
          'B': 20,
          'C': 10,
          'D': 3,
          'F': 2
        },
        graderPerformance: [
          {
            graderId: 'grader_1',
            gradedCount: 25,
            averageGradingTime: 280
          }
        ]
      };

      quizController.getGradingStatistics.mockResolvedValue(mockGradingStats);

      const response = await request(app)
        .get('/api/quizzes/quiz_123/grading-statistics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockGradingStats);
    });
  });

  describe('GET /api/quizzes/submissions/:submissionId', () => {
    it('should retrieve specific submission', async () => {
      const mockSubmission = {
        id: 'submission_123',
        quizId: 'quiz_123',
        userId: 'user_123',
        answers: [],
        score: 85,
        feedback: 'Good work!',
        submittedAt: new Date(),
        gradedAt: new Date()
      };

      quizController.getSubmissionById.mockResolvedValue(mockSubmission);

      const response = await request(app)
        .get('/api/quizzes/submissions/submission_123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSubmission);
      expect(quizController.getSubmissionById).toHaveBeenCalledWith('submission_123');
    });

    it('should handle non-existent submission', async () => {
      quizController.getSubmissionById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/quizzes/submissions/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/quizzes/submissions/:submissionId/regrade', () => {
    it('should regrade submission successfully', async () => {
      const regradeData = {
        newAnswers: [
          { questionId: 'q1', answer: 1 },
          { questionId: 'q2', answer: 'Updated answer' }
        ],
        feedback: 'Regraded with updated scoring'
      };

      const regradedSubmission = {
        id: 'submission_123',
        score: 92,
        previousScore: 85,
        regradedAt: new Date(),
        regradedBy: 'instructor_123',
        feedback: 'Regraded with updated scoring'
      };

      quizController.regradeSubmission.mockResolvedValue(regradedSubmission);

      const response = await request(app)
        .post('/api/quizzes/submissions/submission_123/regrade')
        .send(regradeData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(regradedSubmission);
      expect(quizController.regradeSubmission).toHaveBeenCalledWith('submission_123', regradeData);
    });

    it('should validate regrade data', async () => {
      const invalidRegrade = {
        newAnswers: [], // empty
        feedback: '' // empty
      };

      const response = await request(app)
        .post('/api/quizzes/submissions/submission_123/regrade')
        .send(invalidRegrade);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quizzes/health', () => {
    it('should return health status', async () => {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        uptime: 3600,
        database: 'connected',
        cache: 'connected'
      };

      quizController.healthCheck.mockResolvedValue(healthStatus);

      const response = await request(app)
        .get('/api/quizzes/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(healthStatus);
    });

    it('should handle unhealthy status', async () => {
      const healthStatus = {
        status: 'unhealthy',
        timestamp: new Date(),
        issues: ['Database connection lost']
      };

      quizController.healthCheck.mockResolvedValue(healthStatus);

      const response = await request(app)
        .get('/api/quizzes/health');

      expect(response.status).toBe(503);
      expect(response.body.data.status).toBe('unhealthy');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed request bodies', async () => {
      const response = await request(app)
        .post('/api/quizzes')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle concurrent quiz submissions', async () => {
      const submissionData = { userId: 'user_123', answers: [] };
      
      quizController.submitQuiz
        .mockResolvedValueOnce({ id: 'sub_1', score: 85 })
        .mockResolvedValueOnce({ id: 'sub_2', score: 90 });

      const [response1, response2] = await Promise.all([
        request(app).post('/api/quizzes/quiz_123/submit').send(submissionData),
        request(app).post('/api/quizzes/quiz_123/submit').send(submissionData)
      ]);

      expect(response1.status).toBe(201);
      expect(response2.status).toBe(201);
    });

    it('should handle large quiz data', async () => {
      const largeQuiz = {
        title: 'Large Quiz',
        questions: Array(1000).fill().map((_, i) => ({
          id: `q${i}`,
          question: `Question ${i}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 0
        }))
      };

      quizController.createQuiz.mockRejectedValue(new Error('Quiz too large'));

      const response = await request(app)
        .post('/api/quizzes')
        .send(largeQuiz);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle network timeouts', async () => {
      quizController.getQuizzes.mockImplementation(() =>
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      const response = await request(app)
        .get('/api/quizzes');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
