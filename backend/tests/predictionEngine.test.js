const LearningOutcomePredictionEngine = require('../src/ml/predictionEngine');
const AtRiskStudentIdentification = require('../src/ml/atRiskIdentification');
const InterventionRecommendationEngine = require('../src/ml/interventionEngine');
const LearningPathOptimizer = require('../src/ml/learningPathOptimizer');

describe('Learning Outcome Prediction Engine', () => {
  let predictionEngine;
  let atRiskIdentifier;
  let interventionEngine;
  let pathOptimizer;

  beforeAll(async () => {
    predictionEngine = new LearningOutcomePredictionEngine();
    atRiskIdentifier = new AtRiskStudentIdentification();
    interventionEngine = new InterventionRecommendationEngine();
    pathOptimizer = new LearningPathOptimizer();
    
    await predictionEngine.initializeModels();
    await atRiskIdentifier.initialize();
  });

  describe('Prediction Engine Initialization', () => {
    test('should initialize models successfully', async () => {
      expect(predictionEngine.models.completion).toBeDefined();
      expect(predictionEngine.models.performance).toBeDefined();
      expect(predictionEngine.models.dropout).toBeDefined();
      expect(predictionEngine.models.engagement).toBeDefined();
    });

    test('should have correct ensemble weights', () => {
      expect(predictionEngine.ensembleWeights.completion).toBeDefined();
      expect(predictionEngine.ensembleWeights.dropout).toBeDefined();
      expect(Object.keys(predictionEngine.ensembleWeights.completion)).toContain('linear');
      expect(Object.keys(predictionEngine.ensembleWeights.completion)).toContain('neural');
    });
  });

  describe('Student Predictions', () => {
    const mockStudentData = {
      id: 'test-student-1',
      averageGrade: 85,
      timeSpent: 1200,
      progress: 75,
      assignmentsCompleted: 8,
      quizzesCompleted: 12,
      engagementScore: 0.8,
      loginFrequency: 15,
      lastLoginDays: 2,
      forumPosts: 5,
      courseRating: 4.2,
      courseDifficulty: 3,
      peersConnected: 8,
      averageSessionDuration: 45,
      skillAssessment: 80,
      motivationLevel: 7
    };

    test('should generate predictions for student', async () => {
      const predictions = await predictionEngine.predictStudentOutcomes(mockStudentData);
      
      expect(predictions).toBeDefined();
      expect(predictions.completion).toBeGreaterThanOrEqual(0);
      expect(predictions.completion).toBeLessThanOrEqual(1);
      expect(predictions.performance).toBeGreaterThanOrEqual(0);
      expect(predictions.performance).toBeLessThanOrEqual(1);
      expect(predictions.dropout).toBeGreaterThanOrEqual(0);
      expect(predictions.dropout).toBeLessThanOrEqual(1);
      expect(predictions.engagement).toBeGreaterThanOrEqual(0);
      expect(predictions.engagement).toBeLessThanOrEqual(1);
    });

    test('should calculate confidence scores', async () => {
      const predictions = await predictionEngine.predictStudentOutcomes(mockStudentData);
      
      expect(predictions.confidence).toBeGreaterThanOrEqual(0);
      expect(predictions.confidence).toBeLessThanOrEqual(1);
    });

    test('should assess risk levels', async () => {
      const predictions = await predictionEngine.predictStudentOutcomes(mockStudentData);
      
      expect(predictions.riskAssessment).toBeDefined();
      expect(predictions.riskAssessment.overall).toBeGreaterThanOrEqual(0);
      expect(predictions.riskAssessment.overall).toBeLessThanOrEqual(1);
      expect(['minimal', 'low', 'medium', 'high', 'critical']).toContain(predictions.riskAssessment.level);
    });
  });

  describe('At-Risk Student Identification', () => {
    const mockStudents = [
      {
        id: 'student-1',
        averageGrade: 95,
        engagementScore: 0.9,
        loginFrequency: 20,
        assignmentCompletionRate: 0.95
      },
      {
        id: 'student-2',
        averageGrade: 45,
        engagementScore: 0.3,
        loginFrequency: 3,
        assignmentCompletionRate: 0.4
      }
    ];

    test('should identify at-risk students', async () => {
      const atRiskStudents = await atRiskIdentifier.identifyAtRiskStudents(mockStudents, 'short');
      
      expect(Array.isArray(atRiskStudents)).toBe(true);
      expect(atRiskStudents.length).toBeGreaterThanOrEqual(0);
    });

    test('should provide intervention urgency', async () => {
      const atRiskStudents = await atRiskIdentifier.identifyAtRiskStudents(mockStudents, 'short');
      
      if (atRiskStudents.length > 0) {
        atRiskStudents.forEach(student => {
          expect(student.interventionUrgency).toBeDefined();
          expect(student.interventionUrgency.score).toBeGreaterThanOrEqual(0);
          expect(student.interventionUrgency.score).toBeLessThanOrEqual(100);
          expect(['low', 'medium', 'high', 'critical']).toContain(student.interventionUrgency.level);
        });
      }
    });

    test('should recommend interventions', async () => {
      const atRiskStudents = await atRiskIdentifier.identifyAtRiskStudents(mockStudents, 'short');
      
      if (atRiskStudents.length > 0) {
        atRiskStudents.forEach(student => {
          expect(student.recommendedActions).toBeDefined();
          expect(Array.isArray(student.recommendedActions)).toBe(true);
        });
      }
    });
  });

  describe('Intervention Recommendations', () => {
    const mockRiskProfile = {
      studentId: 'test-student',
      breakdown: {
        academic: {
          factors: {
            completionRate: 0.6,
            gradeDecline: 0.4
          }
        },
        engagement: {
          factors: {
            forumDecline: 0.7,
            videoCompletion: 0.5
          }
        }
      }
    };

    test('should generate personalized interventions', async () => {
      const interventions = await interventionEngine.generateInterventions(mockRiskProfile);
      
      expect(interventions).toBeDefined();
      expect(interventions.studentId).toBe('test-student');
      expect(interventions.interventions).toBeDefined();
      expect(Array.isArray(interventions.interventions)).toBe(true);
    });

    test('should calculate expected improvement', async () => {
      const interventions = await interventionEngine.generateInterventions(mockRiskProfile);
      
      expect(interventions.expectedImprovement).toBeDefined();
      expect(interventions.expectedImprovement).toBeGreaterThanOrEqual(0);
      expect(interventions.expectedImprovement).toBeLessThanOrEqual(1);
    });

    test('should create implementation plan', async () => {
      const interventions = await interventionEngine.generateInterventions(mockRiskProfile);
      
      expect(interventions.implementationPlan).toBeDefined();
      expect(interventions.implementationPlan.phases).toBeDefined();
      expect(Array.isArray(interventions.implementationPlan.phases)).toBe(true);
    });
  });

  describe('Learning Path Optimization', () => {
    const mockStudentProfile = {
      id: 'test-student',
      preferences: {
        visual: 0.8,
        auditory: 0.4,
        kinesthetic: 0.6
      },
      learningStyle: 'visual',
      pace: 'normal',
      priorKnowledge: {
        level: 'medium',
        confidence: 0.7
      }
    };

    const mockCourseContent = {
      modules: [
        {
          id: 'module-1',
          title: 'Introduction',
          difficulty: 2,
          estimatedTime: 60,
          content: [
            { type: 'video', duration: 15 },
            { type: 'text', duration: 30 },
            { type: 'quiz', duration: 15 }
          ],
          skills: ['basic-concepts']
        },
        {
          id: 'module-2',
          title: 'Advanced Topics',
          difficulty: 3,
          estimatedTime: 90,
          content: [
            { type: 'video', duration: 30 },
            { type: 'interactive', duration: 45 },
            { type: 'assessment', duration: 15 }
          ],
          skills: ['advanced-concepts']
        }
      ]
    };

    test('should optimize learning path', async () => {
      const optimizedPath = await pathOptimizer.optimizeLearningPath(
        mockStudentProfile,
        mockCourseContent
      );
      
      expect(optimizedPath).toBeDefined();
      expect(optimizedPath.studentId).toBe('test-student');
      expect(optimizedPath.optimizedPath).toBeDefined();
      expect(optimizedPath.expectedOutcomes).toBeDefined();
    });

    test('should adjust content sequence based on learning style', async () => {
      const optimizedPath = await pathOptimizer.optimizeLearningPath(
        mockStudentProfile,
        mockCourseContent
      );
      
      expect(optimizedPath.optimizedPath.modules).toBeDefined();
      expect(Array.isArray(optimizedPath.optimizedPath.modules)).toBe(true);
      
      optimizedPath.optimizedPath.modules.forEach(module => {
        expect(module.contentSequence).toBeDefined();
        expect(Array.isArray(module.contentSequence)).toBe(true);
      });
    });

    test('should generate recommendations', async () => {
      const optimizedPath = await pathOptimizer.optimizeLearningPath(
        mockStudentProfile,
        mockCourseContent
      );
      
      expect(optimizedPath.recommendations).toBeDefined();
      expect(Array.isArray(optimizedPath.recommendations)).toBe(true);
    });
  });

  describe('Model Training and Updates', () => {
    const mockTrainingData = [
      {
        id: 'student-1',
        averageGrade: 85,
        timeSpent: 1200,
        progress: 90,
        courseCompleted: true,
        finalGrade: 88,
        droppedOut: false,
        engagementScore: 0.85
      },
      {
        id: 'student-2',
        averageGrade: 45,
        timeSpent: 300,
        progress: 30,
        courseCompleted: false,
        finalGrade: 42,
        droppedOut: true,
        engagementScore: 0.25
      }
    ];

    test('should train models with new data', async () => {
      const trainingResults = await predictionEngine.trainModels(mockTrainingData);
      
      expect(trainingResults).toBeDefined();
      expect(Object.keys(trainingResults)).toContain('completion');
      expect(Object.keys(trainingResults)).toContain('performance');
      expect(Object.keys(trainingResults)).toContain('dropout');
      expect(Object.keys(trainingResults)).toContain('engagement');
    });

    test('should track model accuracy', async () => {
      const accuracy = predictionEngine.getModelAccuracy();
      
      expect(accuracy).toBeDefined();
      expect(typeof accuracy).toBe('object');
    });
  });

  describe('Feature Engineering', () => {
    test('should extract features correctly', () => {
      const mockStudent = {
        averageGrade: 85,
        timeSpent: 1200,
        progress: 75,
        assignmentsCompleted: 8
      };

      const features = predictionEngine.featurePipeline.extractFeatures(mockStudent);
      
      expect(features.completion).toBeDefined();
      expect(features.performance).toBeDefined();
      expect(features.dropout).toBeDefined();
      expect(features.engagement).toBeDefined();
      expect(Array.isArray(features.completion)).toBe(true);
      expect(features.completion.length).toBe(15); // 15 features for completion
    });

    test('should normalize features', () => {
      const mockData = [
        { averageGrade: 100, progress: 100 },
        { averageGrade: 0, progress: 0 }
      ];

      const { features } = predictionEngine.featurePipeline.prepareTrainingData(mockData);
      
      expect(features.completion).toBeDefined();
      expect(Array.isArray(features.completion)).toBe(true);
      expect(features.completion.length).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid student data gracefully', async () => {
      const invalidData = null;
      
      await expect(predictionEngine.predictStudentOutcomes(invalidData))
        .rejects.toThrow();
    });

    test('should handle missing required fields', async () => {
      const incompleteData = { id: 'test' };
      
      const predictions = await predictionEngine.predictStudentOutcomes(incompleteData);
      
      expect(predictions).toBeDefined();
      // Should still work with default values
    });
  });
});

describe('Integration Tests', () => {
  let predictionEngine;
  let atRiskIdentifier;
  let interventionEngine;

  beforeAll(async () => {
    predictionEngine = new LearningOutcomePredictionEngine();
    atRiskIdentifier = new AtRiskStudentIdentification();
    interventionEngine = new InterventionRecommendationEngine();
    
    await predictionEngine.initializeModels();
    await atRiskIdentifier.initialize();
  });

  test('should identify at-risk students and generate interventions', async () => {
    const mockStudents = [
      {
        id: 'student-1',
        averageGrade: 35,
        engagementScore: 0.2,
        loginFrequency: 2,
        progress: 25
      },
      {
        id: 'student-2',
        averageGrade: 90,
        engagementScore: 0.9,
        loginFrequency: 25,
        progress: 85
      }
    ];

    // Step 1: Identify at-risk students
    const atRiskStudents = await atRiskIdentifier.identifyAtRiskStudents(mockStudents);
    expect(atRiskStudents.length).toBeGreaterThan(0);

    // Step 2: Generate interventions for at-risk students
    for (const atRiskStudent of atRiskStudents) {
      const interventions = await interventionEngine.generateInterventions(atRiskStudent.riskAssessment);
      
      expect(interventions.interventions.length).toBeGreaterThan(0);
      expect(interventions.expectedImprovement).toBeGreaterThan(0);
    }
  });

  test('should provide complete analytics pipeline', async () => {
    const mockStudent = {
      id: 'integration-test-student',
      averageGrade: 75,
      engagementScore: 0.6,
      loginFrequency: 10,
      progress: 60,
      assignmentsCompleted: 6,
      quizzesCompleted: 8
    };

    // Step 1: Generate predictions
    const predictions = await predictionEngine.predictStudentOutcomes(mockStudent);
    expect(predictions).toBeDefined();

    // Step 2: Assess risk
    const riskAssessment = await atRiskIdentifier.assessStudentRisk(mockStudent, 14);
    expect(riskAssessment).toBeDefined();

    // Step 3: Generate interventions if at risk
    if (riskAssessment.isAtRisk) {
      const interventions = await interventionEngine.generateInterventions(riskAssessment);
      expect(interventions.interventions.length).toBeGreaterThan(0);
    }
  });
});
