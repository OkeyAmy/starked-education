const request = require('supertest');
const app = require('../src/index');

describe('API Endpoints', () => {
  describe('Prediction API', () => {
    test('POST /api/prediction/students/:studentId/predict should generate predictions', async () => {
      const studentData = {
        averageGrade: 85,
        timeSpent: 1200,
        progress: 75,
        engagementScore: 0.8
      };

      const response = await request(app)
        .post('/api/prediction/students/test-student/predict')
        .send(studentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.predictions).toBeDefined();
      expect(response.body.data.studentId).toBe('test-student');
    });

    test('POST /api/prediction/batch/predict should handle batch predictions', async () => {
      const batchData = {
        students: [
          { id: 'student-1', averageGrade: 85 },
          { id: 'student-2', averageGrade: 75 }
        ]
      };

      const response = await request(app)
        .post('/api/prediction/batch/predict')
        .send(batchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(Array.isArray(response.body.data.results)).toBe(true);
      expect(response.body.data.results.length).toBe(2);
    });

    test('POST /api/prediction/at-risk/identify should identify at-risk students', async () => {
      const studentsData = {
        students: [
          { id: 'student-1', averageGrade: 95, engagementScore: 0.9 },
          { id: 'student-2', averageGrade: 45, engagementScore: 0.3 }
        ]
      };

      const response = await request(app)
        .post('/api/prediction/at-risk/identify')
        .send(studentsData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.atRiskStudents).toBeDefined();
      expect(Array.isArray(response.body.data.atRiskStudents)).toBe(true);
    });

    test('POST /api/prediction/students/:studentId/interventions should generate interventions', async () => {
      const riskProfile = {
        studentId: 'test-student',
        breakdown: {
          academic: { factors: { completionRate: 0.6 } },
          engagement: { factors: { forumDecline: 0.7 } }
        }
      };

      const response = await request(app)
        .post('/api/prediction/students/test-student/interventions')
        .send(riskProfile)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.interventions).toBeDefined();
      expect(response.body.data.expectedImprovement).toBeDefined();
    });

    test('POST /api/prediction/students/:studentId/learning-path/optimize should optimize learning path', async () => {
      const pathData = {
        studentProfile: { id: 'test-student', learningStyle: 'visual' },
        courseContent: {
          modules: [
            { id: 'mod-1', title: 'Module 1', difficulty: 2 },
            { id: 'mod-2', title: 'Module 2', difficulty: 3 }
          ]
        }
      };

      const response = await request(app)
        .post('/api/prediction/students/test-student/learning-path/optimize')
        .send(pathData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.optimizedPath).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
    });

    test('GET /api/prediction/models/accuracy should return model accuracy', async () => {
      const response = await request(app)
        .get('/api/prediction/models/accuracy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accuracy).toBeDefined();
    });

    test('GET /api/prediction/health should return health status', async () => {
      const response = await request(app)
        .get('/api/prediction/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Analytics API', () => {
    test('GET /api/analytics/students/:studentId should return student analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/students/test-student')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.studentId).toBe('test-student');
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.progress).toBeDefined();
      expect(response.body.data.performance).toBeDefined();
    });

    test('POST /api/analytics/students/batch should handle batch analytics', async () => {
      const batchData = {
        studentIds: ['student-1', 'student-2']
      };

      const response = await request(app)
        .post('/api/analytics/students/batch')
        .send(batchData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeDefined();
      expect(Array.isArray(response.body.data.results)).toBe(true);
    });

    test('GET /api/analytics/instructors/:instructorId should return instructor analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/instructors/test-instructor')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.instructorId).toBe('test-instructor');
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.courses).toBeDefined();
      expect(response.body.data.studentPerformance).toBeDefined();
    });

    test('GET /api/analytics/platform should return platform analytics', async () => {
      const response = await request(app)
        .get('/api/analytics/platform')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overview).toBeDefined();
      expect(response.body.data.userEngagement).toBeDefined();
      expect(response.body.data.courseAnalytics).toBeDefined();
      expect(response.body.data.financialAnalytics).toBeDefined();
    });

    test('GET /api/analytics/platform/overview should return platform overview', async () => {
      const response = await request(app)
        .get('/api/analytics/platform/overview')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.kpis).toBeDefined();
      expect(response.body.data.quickStats).toBeDefined();
    });

    test('POST /api/analytics/charts/generate should generate charts', async () => {
      const chartData = {
        chartType: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [{
            label: 'Progress',
            data: [65, 70, 75]
          }]
        }
      };

      const response = await request(app)
        .post('/api/analytics/charts/generate')
        .send(chartData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chart).toBeDefined();
      expect(response.body.data.chart.type).toBe('line');
    });

    test('POST /api/analytics/dashboards/generate should generate dashboards', async () => {
      const dashboardData = {
        analyticsData: {
          studentAnalytics: {
            overview: { totalCourses: 5, averageGrade: 85 }
          }
        }
      };

      const response = await request(app)
        .post('/api/analytics/dashboards/generate')
        .send(dashboardData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
      expect(response.body.data.dashboard.charts).toBeDefined();
      expect(response.body.data.dashboard.widgets).toBeDefined();
    });

    test('GET /api/analytics/students/:studentId/dashboard should return student dashboard', async () => {
      const response = await request(app)
        .get('/api/analytics/students/test-student/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
    });

    test('GET /api/analytics/instructors/:instructorId/dashboard should return instructor dashboard', async () => {
      const response = await request(app)
        .get('/api/analytics/instructors/test-instructor/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
    });

    test('GET /api/analytics/platform/dashboard should return platform dashboard', async () => {
      const response = await request(app)
        .get('/api/analytics/platform/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.dashboard).toBeDefined();
    });

    test('POST /api/analytics/reports/generate should generate reports', async () => {
      const reportData = {
        reportType: 'studentProgress',
        data: {
          overview: { totalCourses: 5, averageGrade: 85 }
        }
      };

      const response = await request(app)
        .post('/api/analytics/reports/generate')
        .send(reportData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBeDefined();
      expect(response.body.data.downloadUrl).toBeDefined();
    });

    test('GET /api/analytics/reports/:reportId should return report', async () => {
      // First generate a report
      const reportData = {
        reportType: 'customAnalytics',
        data: { overview: { totalUsers: 1000 } }
      };

      const generateResponse = await request(app)
        .post('/api/analytics/reports/generate')
        .send(reportData)
        .expect(200);

      const reportId = generateResponse.body.data.reportId;

      // Then get the report
      const response = await request(app)
        .get(`/api/analytics/reports/${reportId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBe(reportId);
    });

    test('POST /api/analytics/reports/schedule should schedule reports', async () => {
      const scheduleData = {
        reportType: 'platformAnalytics',
        schedule: {
          frequency: 'weekly',
          day: 'monday',
          time: '09:00'
        },
        data: { overview: { totalUsers: 1000 } }
      };

      const response = await request(app)
        .post('/api/analytics/reports/schedule')
        .send(scheduleData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.scheduledReport).toBeDefined();
    });

    test('GET /api/analytics/realtime/metrics should return real-time metrics', async () => {
      const response = await request(app)
        .get('/api/analytics/realtime/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.activeUsers).toBeDefined();
      expect(response.body.data.currentSessions).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('GET /api/analytics/config should return analytics configuration', async () => {
      const response = await request(app)
        .get('/api/analytics/config')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.chartTypes).toBeDefined();
      expect(response.body.data.timeframes).toBeDefined();
      expect(response.body.data.exportFormats).toBeDefined();
    });

    test('PUT /api/analytics/config should update configuration', async () => {
      const configData = {
        userId: 'test-user',
        settings: {
          theme: 'dark',
          autoRefresh: true,
          refreshInterval: 60000
        }
      };

      const response = await request(app)
        .put('/api/analytics/config')
        .send(configData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBeDefined();
    });

    test('GET /api/analytics/health should return health status', async () => {
      const response = await request(app)
        .get('/api/analytics/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid student ID', async () => {
      const response = await request(app)
        .get('/api/analytics/students/')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should handle missing request body', async () => {
      const response = await request(app)
        .post('/api/prediction/batch/predict')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });

    test('should handle invalid report type', async () => {
      const response = await request(app)
        .post('/api/analytics/reports/generate')
        .send({
          reportType: 'invalid-type',
          data: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid chart type', async () => {
      const response = await request(app)
        .post('/api/analytics/charts/generate')
        .send({
          chartType: 'invalid-type',
          data: {}
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    test('should handle invalid timeframe parameter', async () => {
      const response = await request(app)
        .get('/api/analytics/students/test-student?timeframe=invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid timeframe');
    });
  });

  describe('Request Validation', () => {
    test('should validate batch request size', async () => {
      const largeBatch = {
        students: Array.from({ length: 150 }, (_, i) => ({ id: `student-${i}` }))
      };

      const response = await request(app)
        .post('/api/prediction/batch/predict')
        .send(largeBatch)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Maximum 100 students');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/prediction/students/test-student/predict')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Student ID and data are required');
    });

    test('should validate data types', async () => {
      const response = await request(app)
        .post('/api/analytics/charts/generate')
        .send({
          chartType: 'line',
          data: 'invalid-data-type'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Response Format', () => {
    test('should return consistent success response format', async () => {
      const response = await request(app)
        .get('/api/analytics/platform/overview')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    test('should return consistent error response format', async () => {
      const response = await request(app)
        .get('/api/analytics/students/')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should include timestamps in responses', async () => {
      const response = await request(app)
        .get('/api/analytics/platform')
        .expect(200);

      expect(response.body.data.generatedAt).toBeDefined();
    });
  });
});

describe('API Integration Tests', () => {
  test('should handle complete prediction to analytics workflow', async () => {
    // Step 1: Generate predictions
    const predictionResponse = await request(app)
      .post('/api/prediction/students/integration-student/predict')
      .send({
        averageGrade: 75,
        engagementScore: 0.6,
        progress: 60
      })
      .expect(200);

    expect(predictionResponse.body.success).toBe(true);

    // Step 2: Get analytics (would use prediction data)
    const analyticsResponse = await request(app)
      .get('/api/analytics/students/integration-student')
      .expect(200);

    expect(analyticsResponse.body.success).toBe(true);

    // Step 3: Generate dashboard
    const dashboardResponse = await request(app)
      .get('/api/analytics/students/integration-student/dashboard')
      .expect(200);

    expect(dashboardResponse.body.success).toBe(true);
  });

  test('should handle batch operations efficiently', async () => {
    // Batch prediction
    const batchPredictionResponse = await request(app)
      .post('/api/prediction/batch/predict')
      .send({
        students: [
          { id: 'batch-1', averageGrade: 85 },
          { id: 'batch-2', averageGrade: 75 },
          { id: 'batch-3', averageGrade: 65 }
        ]
      })
      .expect(200);

    expect(batchPredictionResponse.body.success).toBe(true);
    expect(batchPredictionResponse.body.data.results.length).toBe(3);

    // Batch analytics
    const batchAnalyticsResponse = await request(app)
      .post('/api/analytics/students/batch')
      .send({
        studentIds: ['batch-1', 'batch-2', 'batch-3']
      })
      .expect(200);

    expect(batchAnalyticsResponse.body.success).toBe(true);
    expect(batchAnalyticsResponse.body.data.results.length).toBe(3);
  });
});
