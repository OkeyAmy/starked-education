const request = require('supertest');
const app = require('../src/index');
const { AGITutorController } = require('../src/controllers/agiTutorController');

describe('AGI Tutor API Tests', () => {
  let agiTutorController;

  beforeAll(() => {
    agiTutorController = new AGITutorController();
  });

  describe('POST /api/agi-tutor/session', () => {
    it('should generate a personalized learning session', async () => {
      const sessionData = {
        studentId: 'test_student_123',
        subject: 'mathematics',
        topic: 'calculus',
        learningGoals: ['understand derivatives', 'apply chain rule'],
        currentKnowledge: ['basic algebra', 'limits'],
        emotionalState: 'motivated'
      };

      const response = await request(app)
        .post('/api/agi-tutor/session')
        .send(sessionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.subject).toBe('mathematics');
      expect(response.body.data.session.topic).toBe('calculus');
      expect(response.body.data.adaptations).toBeDefined();
      expect(response.body.data.emotionalSupport).toBeDefined();
      expect(response.body.data.crossDomainInsights).toBeDefined();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        studentId: 'test_student_123'
      };

      const response = await request(app)
        .post('/api/agi-tutor/session')
        .send(incompleteData)
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/agi-tutor/response', () => {
    it('should process student response and provide feedback', async () => {
      const responseData = {
        sessionId: 'session_test_123',
        studentResponse: 'The derivative of x^2 is 2x using the power rule',
        confidenceLevel: 0.8,
        responseTime: 15000
      };

      const response = await request(app)
        .post('/api/agi-tutor/response')
        .send(responseData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toBeDefined();
      expect(response.body.data.nextAction).toBeDefined();
      expect(response.body.data.profileUpdate).toBeDefined();
    });
  });

  describe('POST /api/agi-tutor/assessment', () => {
    it('should generate adaptive assessment', async () => {
      const assessmentData = {
        studentId: 'test_student_123',
        subject: 'physics',
        topics: ['mechanics', 'thermodynamics'],
        assessmentType: 'comprehensive',
        difficulty: 7
      };

      const response = await request(app)
        .post('/api/agi-tutor/assessment')
        .send(assessmentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessmentId).toBeDefined();
      expect(response.body.data.questions).toBeDefined();
      expect(response.body.data.evaluationRubric).toBeDefined();
      expect(response.body.data.timeLimit).toBeDefined();
    });
  });

  describe('POST /api/agi-tutor/guidance', () => {
    it('should provide teaching guidance for instructors', async () => {
      const guidanceData = {
        classId: 'class_math_101',
        subject: 'mathematics',
        currentTopic: 'integral calculus',
        studentStates: [
          { studentId: 'student1', engagement: 'high', understanding: 'good' },
          { studentId: 'student2', engagement: 'medium', understanding: 'struggling' }
        ]
      };

      const response = await request(app)
        .post('/api/agi-tutor/guidance')
        .send(guidanceData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.strategies).toBeDefined();
      expect(response.body.data.interventions).toBeDefined();
      expect(response.body.data.engagementStrategies).toBeDefined();
    });
  });

  describe('GET /api/agi-tutor/visualization', () => {
    it('should generate knowledge visualization', async () => {
      const response = await request(app)
        .get('/api/agi-tutor/visualization')
        .query({
          subject: 'biology',
          topic: 'genetics',
          depth: 3
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('knowledge_graph');
      expect(response.body.data.hierarchy).toBeDefined();
      expect(response.body.data.conceptMap).toBeDefined();
      expect(response.body.data.learningPaths).toBeDefined();
      expect(response.body.data.connections).toBeDefined();
    });
  });

  describe('POST /api/agi-tutor/progress', () => {
    it('should track learning progress and predict outcomes', async () => {
      const progressData = {
        studentId: 'test_student_123',
        sessionId: 'session_test_123',
        learningData: [
          { concept: 'derivatives', mastery: 0.8, timeSpent: 1200 },
          { concept: 'chain rule', mastery: 0.6, timeSpent: 1800 }
        ]
      };

      const response = await request(app)
        .post('/api/agi-tutor/progress')
        .send(progressData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.predictions).toBeDefined();
      expect(response.body.data.predictions.shortTerm).toBeDefined();
      expect(response.body.data.predictions.longTerm).toBeDefined();
      expect(response.body.data.predictions.mastery).toBeDefined();
    });
  });

  describe('POST /api/agi-tutor/recommendations', () => {
    it('should generate personalized learning recommendations', async () => {
      const recommendationsData = {
        studentId: 'test_student_123',
        interests: ['mathematics', 'computer science', 'physics'],
        goals: ['become data scientist', 'master machine learning'],
        currentLevel: 'intermediate'
      };

      const response = await request(app)
        .post('/api/agi-tutor/recommendations')
        .send(recommendationsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.learningPaths).toBeDefined();
      expect(response.body.data.resources).toBeDefined();
      expect(response.body.data.projects).toBeDefined();
      expect(response.body.data.personalizedFor).toBe('test_student_123');
    });
  });

  describe('POST /api/agi-tutor/emotional-support', () => {
    it('should provide emotional support and motivation', async () => {
      const emotionalData = {
        studentId: 'test_student_123',
        emotionalState: 'frustrated',
        context: 'struggling with difficult calculus problems'
      };

      const response = await request(app)
        .post('/api/agi-tutor/emotional-support')
        .send(emotionalData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.strategies).toBeDefined();
      expect(response.body.data.interventions).toBeDefined();
      expect(response.body.data.resources).toBeDefined();
      expect(response.body.data.followUpActions).toBeDefined();
    });
  });
});

describe('AGI Tutor Service Integration Tests', () => {
  describe('Universal Knowledge Service', () => {
    it('should provide comprehensive knowledge graphs', async () => {
      // Test knowledge graph generation
      const knowledgeService = require('../src/services/universalKnowledgeService');
      const service = new knowledgeService.UniversalKnowledgeService();
      
      const subjectKnowledge = await service.getSubjectKnowledge('mathematics', 'calculus');
      expect(subjectKnowledge.subject).toBe('mathematics');
      expect(subjectKnowledge.knowledgeGraph).toBeDefined();
      expect(subjectKnowledge.crossDomainConnections).toBeDefined();
    });

    it('should find cross-domain connections', async () => {
      const knowledgeService = require('../src/services/universalKnowledgeService');
      const service = new knowledgeService.UniversalKnowledgeService();
      
      const connections = await service.findConnections('mathematics', 'calculus');
      expect(Array.isArray(connections)).toBe(true);
    });
  });

  describe('Student Adaptation Service', () => {
    it('should analyze student profiles and provide adaptations', async () => {
      const adaptationService = require('../src/services/studentAdaptationService');
      const service = new adaptationService.StudentAdaptationService();
      
      const studentProfile = await service.analyzeStudent('test_student', {
        learningGoals: ['master calculus'],
        currentKnowledge: ['algebra'],
        emotionalState: 'motivated'
      });
      
      expect(studentProfile.studentId).toBe('test_student');
      expect(studentProfile.adaptations).toBeDefined();
    });
  });

  describe('Emotional Intelligence Service', () => {
    it('should analyze emotional states and provide support', async () => {
      const emotionalService = require('../src/services/emotionalIntelligenceService');
      const service = new emotionalService.EmotionalIntelligenceService();
      
      const emotionalProfile = await service.analyzeEmotionalState('frustrated');
      expect(emotionalProfile.currentEmotion).toBeDefined();
      expect(emotionalProfile.supportStrategies).toBeDefined();
    });
  });

  describe('Cross-Domain Integration Service', () => {
    it('should integrate knowledge across domains', async () => {
      const integrationService = require('../src/services/crossDomainIntegrationService');
      const service = new integrationService.CrossDomainIntegrationService();
      
      const connections = await service.findConnections('mathematics', 'calculus');
      expect(Array.isArray(connections)).toBe(true);
    });
  });
});

describe('AGI Tutor Performance Tests', () => {
  it('should handle concurrent requests efficiently', async () => {
    const promises = [];
    const concurrentRequests = 10;

    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        request(app)
          .post('/api/agi-tutor/session')
          .send({
            studentId: `student_${i}`,
            subject: 'mathematics',
            topic: 'calculus',
            learningGoals: ['understand derivatives'],
            currentKnowledge: ['algebra'],
            emotionalState: 'motivated'
          })
      );
    }

    const responses = await Promise.all(promises);
    
    responses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  it('should respond within acceptable time limits', async () => {
    const startTime = Date.now();
    
    await request(app)
      .post('/api/agi-tutor/session')
      .send({
        studentId: 'performance_test_student',
        subject: 'physics',
        topic: 'mechanics',
        learningGoals: ['understand motion'],
        currentKnowledge: ['basic math'],
        emotionalState: 'curious'
      });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Should respond within 5 seconds
    expect(responseTime).toBeLessThan(5000);
  });
});
