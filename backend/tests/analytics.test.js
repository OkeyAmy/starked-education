const StudentAnalyticsService = require('../src/services/studentAnalytics');
const InstructorAnalyticsService = require('../src/services/instructorAnalytics');
const PlatformAnalyticsService = require('../src/services/platformAnalytics');
const DataVisualizationService = require('../src/services/dataVisualization');
const ReportGenerationService = require('../src/services/reportGeneration');

describe('Analytics Services', () => {
  let studentAnalytics;
  let instructorAnalytics;
  let platformAnalytics;
  let dataVisualization;
  let reportGeneration;

  beforeAll(() => {
    studentAnalytics = new StudentAnalyticsService();
    instructorAnalytics = new InstructorAnalyticsService();
    platformAnalytics = new PlatformAnalyticsService();
    dataVisualization = new DataVisualizationService();
    reportGeneration = new ReportGenerationService();
  });

  describe('Student Analytics Service', () => {
    test('should generate comprehensive student analytics', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1', {
        timeframe: 'month',
        includeComparisons: true,
        includePredictions: true
      });

      expect(analytics).toBeDefined();
      expect(analytics.studentId).toBe('test-student-1');
      expect(analytics.overview).toBeDefined();
      expect(analytics.progress).toBeDefined();
      expect(analytics.performance).toBeDefined();
      expect(analytics.engagement).toBeDefined();
      expect(analytics.timeSpent).toBeDefined();
      expect(analytics.skills).toBeDefined();
    });

    test('should calculate overview metrics correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.overview.totalCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.completedCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.inProgressCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.overallProgress).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.overallProgress).toBeLessThanOrEqual(1);
      expect(analytics.overview.averageGrade).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.averageGrade).toBeLessThanOrEqual(100);
    });

    test('should analyze progress correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.progress.overall).toBeGreaterThanOrEqual(0);
      expect(analytics.progress.overall).toBeLessThanOrEqual(1);
      expect(analytics.progress.byCourse).toBeDefined();
      expect(analytics.progress.completionRate).toBeGreaterThanOrEqual(0);
      expect(analytics.progress.completionRate).toBeLessThanOrEqual(1);
    });

    test('should analyze performance correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.performance.overall).toBeDefined();
      expect(analytics.performance.overall.averageGrade).toBeGreaterThanOrEqual(0);
      expect(analytics.performance.overall.averageGrade).toBeLessThanOrEqual(100);
      expect(analytics.performance.byCourse).toBeDefined();
      expect(analytics.performance.gradeDistribution).toBeDefined();
    });

    test('should analyze engagement correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.engagement.overall).toBeDefined();
      expect(analytics.engagement.overall.score).toBeGreaterThanOrEqual(0);
      expect(analytics.engagement.overall.score).toBeLessThanOrEqual(1);
      expect(analytics.engagement.loginFrequency).toBeDefined();
      expect(analytics.engagement.sessionDuration).toBeDefined();
    });

    test('should analyze time spent correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.timeSpent.total).toBeGreaterThanOrEqual(0);
      expect(analytics.timeSpent.byCourse).toBeDefined();
      expect(analytics.timeSpent.byActivity).toBeDefined();
      expect(analytics.timeSpent.analysis).toBeDefined();
    });

    test('should analyze skills correctly', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.skills.currentSkills).toBeDefined();
      expect(Array.isArray(analytics.skills.currentSkills)).toBe(true);
      expect(analytics.skills.skillProgress).toBeDefined();
      expect(analytics.skills.skillGaps).toBeDefined();
      expect(analytics.skills.recommendations).toBeDefined();
    });

    test('should generate recommendations', async () => {
      const analytics = await studentAnalytics.getStudentAnalytics('test-student-1');
      
      expect(analytics.recommendations).toBeDefined();
      expect(analytics.recommendations.immediate).toBeDefined();
      expect(analytics.recommendations.shortTerm).toBeDefined();
      expect(analytics.recommendations.longTerm).toBeDefined();
      expect(Array.isArray(analytics.recommendations.immediate)).toBe(true);
    });
  });

  describe('Instructor Analytics Service', () => {
    test('should generate comprehensive instructor analytics', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1', {
        timeframe: 'semester',
        includeComparisons: true,
        includePredictions: true
      });

      expect(analytics).toBeDefined();
      expect(analytics.instructorId).toBe('test-instructor-1');
      expect(analytics.overview).toBeDefined();
      expect(analytics.courses).toBeDefined();
      expect(analytics.studentPerformance).toBeDefined();
      expect(analytics.engagement).toBeDefined();
      expect(analytics.assessments).toBeDefined();
    });

    test('should calculate instructor overview correctly', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.overview.totalCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.activeCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.totalStudents).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.averageClassSize).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.overallSatisfaction).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.overallSatisfaction).toBeLessThanOrEqual(5);
    });

    test('should analyze courses correctly', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.courses.courses).toBeDefined();
      expect(Array.isArray(analytics.courses.courses)).toBe(true);
      expect(analytics.courses.comparisons).toBeDefined();
      expect(analytics.courses.trends).toBeDefined();
      expect(analytics.courses.summary).toBeDefined();
    });

    test('should analyze student performance correctly', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.studentPerformance.overall).toBeDefined();
      expect(analytics.studentPerformance.byCourse).toBeDefined();
      expect(analytics.studentPerformance.gradeDistribution).toBeDefined();
      expect(analytics.studentPerformance.riskAnalysis).toBeDefined();
    });

    test('should analyze engagement correctly', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.engagement.overall).toBeDefined();
      expect(analytics.engagement.metrics).toBeDefined();
      expect(analytics.engagement.analysis).toBeDefined();
    });

    test('should analyze assessments correctly', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.assessments.overview).toBeDefined();
      expect(analytics.assessments.byType).toBeDefined();
      expect(analytics.assessments.effectiveness).toBeDefined();
      expect(analytics.assessments.analysis).toBeDefined();
    });

    test('should generate instructor recommendations', async () => {
      const analytics = await instructorAnalytics.getInstructorAnalytics('test-instructor-1');
      
      expect(analytics.recommendations).toBeDefined();
      expect(analytics.recommendations.immediate).toBeDefined();
      expect(analytics.recommendations.shortTerm).toBeDefined();
      expect(analytics.recommendations.longTerm).toBeDefined();
      expect(analytics.recommendations.courseSpecific).toBeDefined();
    });
  });

  describe('Platform Analytics Service', () => {
    test('should generate comprehensive platform analytics', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics({
        timeframe: 'month',
        includeComparisons: true,
        includePredictions: true
      });

      expect(analytics).toBeDefined();
      expect(analytics.overview).toBeDefined();
      expect(analytics.userEngagement).toBeDefined();
      expect(analytics.courseAnalytics).toBeDefined();
      expect(analytics.financialAnalytics).toBeDefined();
      expect(analytics.systemPerformance).toBeDefined();
      expect(analytics.growthMetrics).toBeDefined();
    });

    test('should calculate platform overview correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.overview.totalUsers).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.activeUsers).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.totalCourses).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.totalRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.overview.monthlyRecurringRevenue).toBeGreaterThanOrEqual(0);
    });

    test('should calculate KPIs correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.overview.kpis).toBeDefined();
      expect(analytics.overview.kpis.userGrowthRate).toBeDefined();
      expect(analytics.overview.kpis.revenueGrowthRate).toBeDefined();
      expect(analytics.overview.kpis.engagementRate).toBeDefined();
      expect(analytics.overview.kpis.retentionRate).toBeDefined();
      expect(analytics.overview.kpis.churnRate).toBeDefined();
    });

    test('should analyze user engagement correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.userEngagement.overview).toBeDefined();
      expect(analytics.userEngagement.metrics).toBeDefined();
      expect(analytics.userEngagement.metrics.dailyActiveUsers).toBeGreaterThanOrEqual(0);
      expect(analytics.userEngagement.metrics.monthlyActiveUsers).toBeGreaterThanOrEqual(0);
      expect(analytics.userEngagement.metrics.stickinessRatio).toBeGreaterThanOrEqual(0);
    });

    test('should analyze course analytics correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.courseAnalytics.overview).toBeDefined();
      expect(analytics.courseAnalytics.metrics).toBeDefined();
      expect(analytics.courseAnalytics.analysis).toBeDefined();
      expect(analytics.courseAnalytics.metrics.totalCourses).toBeGreaterThanOrEqual(0);
    });

    test('should analyze financial analytics correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.financialAnalytics.overview).toBeDefined();
      expect(analytics.financialAnalytics.metrics).toBeDefined();
      expect(analytics.financialAnalytics.analysis).toBeDefined();
      expect(analytics.financialAnalytics.metrics.totalRevenue).toBeGreaterThanOrEqual(0);
    });

    test('should analyze system performance correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.systemPerformance.overview).toBeDefined();
      expect(analytics.systemPerformance.metrics).toBeDefined();
      expect(analytics.systemPerformance.analysis).toBeDefined();
      expect(analytics.systemPerformance.metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(analytics.systemPerformance.metrics.uptime).toBeLessThanOrEqual(1);
    });

    test('should analyze growth metrics correctly', async () => {
      const analytics = await platformAnalytics.getPlatformAnalytics();
      
      expect(analytics.growthMetrics.overview).toBeDefined();
      expect(analytics.growthMetrics.metrics).toBeDefined();
      expect(analytics.growthMetrics.analysis).toBeDefined();
      expect(analytics.growthMetrics.metrics.userGrowthRate).toBeDefined();
    });
  });

  describe('Data Visualization Service', () => {
    test('should generate line chart', () => {
      const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Progress',
          data: [65, 70, 75, 80, 85]
        }]
      };

      const chart = dataVisualization.generateChart(data, 'line');
      
      expect(chart.success).toBe(true);
      expect(chart.chart).toBeDefined();
      expect(chart.chart.type).toBe('line');
      expect(chart.chart.data).toBeDefined();
      expect(chart.chart.options).toBeDefined();
    });

    test('should generate bar chart', () => {
      const data = {
        labels: ['Course 1', 'Course 2', 'Course 3'],
        datasets: [{
          label: 'Grades',
          data: [85, 78, 92]
        }]
      };

      const chart = dataVisualization.generateChart(data, 'bar');
      
      expect(chart.success).toBe(true);
      expect(chart.chart.type).toBe('bar');
      expect(chart.chart.data).toBeDefined();
    });

    test('should generate pie chart', () => {
      const data = {
        labels: ['Videos', 'Quizzes', 'Assignments', 'Forum'],
        values: [35, 25, 30, 10]
      };

      const chart = dataVisualization.generateChart(data, 'pie');
      
      expect(chart.success).toBe(true);
      expect(chart.chart.type).toBe('pie');
      expect(chart.chart.data).toBeDefined();
    });

    test('should generate dashboard', () => {
      const analyticsData = {
        studentAnalytics: {
          overview: { totalCourses: 5, averageGrade: 85 },
          progress: { overall: 0.75 },
          performance: { overall: { averageGrade: 85 } }
        }
      };

      const dashboard = dataVisualization.generateDashboard(analyticsData);
      
      expect(dashboard.success).toBe(true);
      expect(dashboard.dashboard).toBeDefined();
      expect(dashboard.dashboard.charts).toBeDefined();
      expect(dashboard.dashboard.widgets).toBeDefined();
      expect(dashboard.dashboard.filters).toBeDefined();
    });

    test('should handle invalid chart data', () => {
      const invalidData = null;
      
      const chart = dataVisualization.generateChart(invalidData, 'line');
      
      expect(chart.success).toBe(false);
      expect(chart.error).toBeDefined();
    });

    test('should export chart', () => {
      const chartConfig = {
        type: 'line',
        data: { labels: ['A', 'B'], datasets: [{ data: [1, 2] }] }
      };

      const exportData = dataVisualization.exportChart(chartConfig, 'png');
      
      expect(exportData.success).toBe(true);
      expect(exportData.exportUrl).toBeDefined();
      expect(exportData.filename).toBeDefined();
    });
  });

  describe('Report Generation Service', () => {
    test('should generate student progress report', async () => {
      const reportData = {
        overview: { totalCourses: 5, averageGrade: 85 },
        progress: { overall: 0.75 },
        performance: { overall: { averageGrade: 85 } }
      };

      const report = await reportGeneration.generateReport('studentProgress', reportData, {
        format: 'pdf',
        includeCharts: true
      });

      expect(report.success).toBe(true);
      expect(report.reportId).toBeDefined();
      expect(report.reportType).toBe('studentProgress');
      expect(report.format).toBe('pdf');
      expect(report.downloadUrl).toBeDefined();
    });

    test('should generate instructor performance report', async () => {
      const reportData = {
        overview: { totalCourses: 3, totalStudents: 150 },
        courses: { courses: [] },
        studentPerformance: { overall: { averageGrade: 82 } }
      };

      const report = await reportGeneration.generateReport('instructorPerformance', reportData, {
        format: 'excel',
        includeCharts: true
      });

      expect(report.success).toBe(true);
      expect(report.reportType).toBe('instructorPerformance');
      expect(report.format).toBe('excel');
    });

    test('should generate platform analytics report', async () => {
      const reportData = {
        overview: { totalUsers: 10000, totalRevenue: 100000 },
        userEngagement: { overview: { totalSessions: 50000 } },
        courseAnalytics: { overview: { totalCourses: 500 } }
      };

      const report = await reportGeneration.generateReport('platformAnalytics', reportData, {
        format: 'csv',
        includeCharts: false
      });

      expect(report.success).toBe(true);
      expect(report.reportType).toBe('platformAnalytics');
      expect(report.format).toBe('csv');
    });

    test('should export to different formats', async () => {
      const reportData = { overview: { totalUsers: 1000 } };
      
      const pdfReport = await reportGeneration.generateReport('customAnalytics', reportData, { format: 'pdf' });
      const excelReport = await reportGeneration.generateReport('customAnalytics', reportData, { format: 'excel' });
      const csvReport = await reportGeneration.generateReport('customAnalytics', reportData, { format: 'csv' });
      const jsonReport = await reportGeneration.generateReport('customAnalytics', reportData, { format: 'json' });

      expect(pdfReport.format).toBe('pdf');
      expect(excelReport.format).toBe('excel');
      expect(csvReport.format).toBe('csv');
      expect(jsonReport.format).toBe('json');
    });

    test('should handle invalid report data', async () => {
      const invalidData = null;
      
      await expect(reportGeneration.generateReport('studentProgress', invalidData))
        .rejects.toThrow();
    });

    test('should cache reports', async () => {
      const reportData = { overview: { totalUsers: 1000 } };
      
      const report1 = await reportGeneration.generateReport('customAnalytics', reportData);
      const report2 = await reportGeneration.getReport(report1.reportId);

      expect(report2.reportId).toBe(report1.reportId);
      expect(report2.data).toBeDefined();
    });
  });
});

describe('Analytics Integration Tests', () => {
  let studentAnalytics;
  let instructorAnalytics;
  let platformAnalytics;
  let dataVisualization;

  beforeAll(() => {
    studentAnalytics = new StudentAnalyticsService();
    instructorAnalytics = new InstructorAnalyticsService();
    platformAnalytics = new PlatformAnalyticsService();
    dataVisualization = new DataVisualizationService();
  });

  test('should provide complete analytics pipeline', async () => {
    // Step 1: Get student analytics
    const studentAnalyticsData = await studentAnalytics.getStudentAnalytics('integration-student');
    expect(studentAnalyticsData).toBeDefined();

    // Step 2: Generate visualization
    const progressChart = dataVisualization.generateChart({
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [{
        label: 'Progress',
        data: [60, 65, 70, 75]
      }]
    }, 'line');
    expect(progressChart.success).toBe(true);

    // Step 3: Generate dashboard
    const dashboard = dataVisualization.generateDashboard({
      studentAnalytics: studentAnalyticsData
    });
    expect(dashboard.success).toBe(true);

    // Step 4: Generate report
    const report = await reportGeneration.generateReport('studentProgress', studentAnalyticsData);
    expect(report.success).toBe(true);
  });

  test('should handle cross-service data flow', async () => {
    // Get platform analytics
    const platformAnalyticsData = await platformAnalytics.getPlatformAnalytics();
    expect(platformAnalyticsData).toBeDefined();

    // Generate instructor analytics (would use platform data)
    const instructorAnalyticsData = await instructorAnalytics.getInstructorAnalytics('test-instructor');
    expect(instructorAnalyticsData).toBeDefined();

    // Generate comprehensive dashboard
    const comprehensiveDashboard = dataVisualization.generateDashboard({
      platformAnalytics: platformAnalyticsData,
      instructorAnalytics: instructorAnalyticsData
    });
    expect(comprehensiveDashboard.success).toBe(true);
    expect(comprehensiveDashboard.dashboard.charts.length).toBeGreaterThan(0);
  });
});
