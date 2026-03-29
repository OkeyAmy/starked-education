const _ = require('lodash');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ReportGenerationService {
  constructor() {
    this.reportTemplates = {
      studentProgress: 'student_progress_template',
      instructorPerformance: 'instructor_performance_template',
      platformAnalytics: 'platform_analytics_template',
      customAnalytics: 'custom_analytics_template'
    };

    this.exportFormats = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      csv: 'text/csv',
      json: 'application/json',
      html: 'text/html'
    };

    this.reportCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async generateReport(reportType, data, options = {}) {
    try {
      const {
        format = 'pdf',
        template = null,
        filters = {},
        customFields = [],
        includeCharts = true,
        includeRawData = false,
        schedule = null
      } = options;

      // Validate input
      if (!this.reportTemplates[reportType] && !template) {
        throw new Error('Invalid report type or template not provided');
      }

      // Generate report content
      const reportContent = await this.generateReportContent(reportType, data, {
        filters,
        customFields,
        includeCharts,
        includeRawData
      });

      // Apply template
      const formattedReport = await this.applyTemplate(reportContent, template || this.reportTemplates[reportType]);

      // Export to requested format
      const exportedReport = await this.exportReport(formattedReport, format, {
        includeCharts,
        filename: this.generateFilename(reportType, format)
      });

      // Cache the report
      const reportId = this.cacheReport(exportedReport, reportType, data, options);

      return {
        success: true,
        reportId,
        reportType,
        format,
        downloadUrl: exportedReport.downloadUrl,
        filename: exportedReport.filename,
        size: exportedReport.size,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.cacheTimeout).toISOString()
      };

    } catch (error) {
      console.error('Error generating report:', error);
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  async generateReportContent(reportType, data, options = {}) {
    const { filters, customFields, includeCharts, includeRawData } = options;

    const content = {
      metadata: {
        reportType,
        generatedAt: new Date().toISOString(),
        dataRange: this.determineDataRange(data),
        filters,
        version: '1.0'
      },
      summary: this.generateSummary(data, reportType),
      sections: [],
      charts: includeCharts ? await this.generateCharts(data, reportType) : [],
      rawData: includeRawData ? this.sanitizeRawData(data) : null
    };

    // Generate sections based on report type
    switch (reportType) {
      case 'studentProgress':
        content.sections = this.generateStudentProgressSections(data);
        break;
      case 'instructorPerformance':
        content.sections = this.generateInstructorPerformanceSections(data);
        break;
      case 'platformAnalytics':
        content.sections = this.generatePlatformAnalyticsSections(data);
        break;
      case 'customAnalytics':
        content.sections = this.generateCustomAnalyticsSections(data, customFields);
        break;
      default:
        content.sections = this.generateGenericSections(data);
    }

    // Add custom fields
    if (customFields.length > 0) {
      content.sections.push(this.generateCustomFieldsSection(customFields, data));
    }

    return content;
  }

  generateSummary(data, reportType) {
    const summary = {
      title: this.getReportTitle(reportType),
      overview: {},
      keyMetrics: [],
      insights: [],
      recommendations: []
    };

    switch (reportType) {
      case 'studentProgress':
        summary.overview = this.generateStudentProgressSummary(data);
        summary.keyMetrics = this.getStudentProgressKeyMetrics(data);
        break;
      case 'instructorPerformance':
        summary.overview = this.generateInstructorPerformanceSummary(data);
        summary.keyMetrics = this.getInstructorPerformanceKeyMetrics(data);
        break;
      case 'platformAnalytics':
        summary.overview = this.generatePlatformAnalyticsSummary(data);
        summary.keyMetrics = this.getPlatformAnalyticsKeyMetrics(data);
        break;
      default:
        summary.overview = this.generateGenericSummary(data);
        summary.keyMetrics = this.getGenericKeyMetrics(data);
    }

    // Generate insights and recommendations
    summary.insights = this.generateInsights(data, reportType);
    summary.recommendations = this.generateRecommendations(data, reportType);

    return summary;
  }

  generateStudentProgressSections(data) {
    const sections = [];

    // Progress Overview
    sections.push({
      title: 'Progress Overview',
      type: 'overview',
      content: {
        overallProgress: data.overview?.overallProgress || 0,
        completedCourses: data.overview?.completedCourses || 0,
        inProgressCourses: data.overview?.inProgressCourses || 0,
        averageGrade: data.overview?.averageGrade || 0,
        studyStreak: data.overview?.studyStreak || 0
      },
      charts: ['progressTrend', 'gradeDistribution']
    });

    // Performance Analysis
    sections.push({
      title: 'Performance Analysis',
      type: 'performance',
      content: {
        overall: data.performance?.overall || {},
        byCourse: data.performance?.byCourse || {},
        trends: data.performance?.trends || {}
      },
      charts: ['performanceByCourse', 'performanceTrend']
    });

    // Engagement Metrics
    sections.push({
      title: 'Engagement Metrics',
      type: 'engagement',
      content: {
        overall: data.engagement?.overall || {},
        metrics: data.engagement?.metrics || {},
        trends: data.engagement?.trends || {}
      },
      charts: ['engagementBreakdown', 'engagementTrend']
    });

    // Time Analysis
    sections.push({
      title: 'Time Analysis',
      type: 'time',
      content: {
        total: data.timeSpent?.total || 0,
        byCourse: data.timeSpent?.byCourse || {},
        analysis: data.timeSpent?.analysis || {}
      },
      charts: ['timeDistribution', 'timeEfficiency']
    });

    // Skills Development
    sections.push({
      title: 'Skills Development',
      type: 'skills',
      content: {
        currentSkills: data.skills?.currentSkills || [],
        skillProgress: data.skills?.skillProgress || {},
        recommendations: data.skills?.recommendations || {}
      },
      charts: ['skillMap', 'skillProgress']
    });

    return sections;
  }

  generateInstructorPerformanceSections(data) {
    const sections = [];

    // Teaching Overview
    sections.push({
      title: 'Teaching Overview',
      type: 'overview',
      content: {
        totalCourses: data.overview?.totalCourses || 0,
        totalStudents: data.overview?.totalStudents || 0,
        averageClassSize: data.overview?.averageClassSize || 0,
        overallSatisfaction: data.overview?.overallSatisfaction || 0
      },
      charts: ['courseDistribution', 'satisfactionTrend']
    });

    // Course Performance
    sections.push({
      title: 'Course Performance',
      type: 'courses',
      content: {
        courses: data.courses?.courses || [],
        comparisons: data.courses?.comparisons || {},
        summary: data.courses?.summary || {}
      },
      charts: ['coursePerformance', 'courseComparison']
    });

    // Student Performance
    sections.push({
      title: 'Student Performance Analysis',
      type: 'studentPerformance',
      content: {
        overall: data.studentPerformance?.overall || {},
        metrics: data.studentPerformance?.metrics || {},
        riskAnalysis: data.studentPerformance?.riskAnalysis || {}
      },
      charts: ['gradeDistribution', 'performanceTrends']
    });

    // Engagement Analysis
    sections.push({
      title: 'Student Engagement',
      type: 'engagement',
      content: {
        overall: data.engagement?.overall || {},
        analysis: data.engagement?.analysis || {},
        patterns: data.engagement?.patterns || {}
      },
      charts: ['engagementMetrics', 'engagementPatterns']
    });

    return sections;
  }

  generatePlatformAnalyticsSections(data) {
    const sections = [];

    // Platform Overview
    sections.push({
      title: 'Platform Overview',
      type: 'overview',
      content: {
        totalUsers: data.overview?.totalUsers || 0,
        activeUsers: data.overview?.activeUsers || 0,
        totalCourses: data.overview?.totalCourses || 0,
        totalRevenue: data.overview?.totalRevenue || 0
      },
      charts: ['userGrowth', 'revenueGrowth']
    });

    // User Engagement
    sections.push({
      title: 'User Engagement Analytics',
      type: 'engagement',
      content: {
        overview: data.userEngagement?.overview || {},
        metrics: data.userEngagement?.metrics || {},
        analysis: data.userEngagement?.analysis || {}
      },
      charts: ['engagementMetrics', 'userActivity']
    });

    // Course Analytics
    sections.push({
      title: 'Course Analytics',
      type: 'courses',
      content: {
        overview: data.courseAnalytics?.overview || {},
        performance: data.courseAnalytics?.performance || {},
        popularity: data.courseAnalytics?.popularity || {}
      },
      charts: ['coursePopularity', 'coursePerformance']
    });

    // Financial Analytics
    sections.push({
      title: 'Financial Performance',
      type: 'financial',
      content: {
        overview: data.financialAnalytics?.overview || {},
        metrics: data.financialAnalytics?.metrics || {},
        analysis: data.financialAnalytics?.analysis || {}
      },
      charts: ['revenueBreakdown', 'financialTrends']
    });

    // Growth Metrics
    sections.push({
      title: 'Growth & Retention',
      type: 'growth',
      content: {
        overview: data.growthMetrics?.overview || {},
        retention: data.retentionAnalytics?.overview || {}
      },
      charts: ['growthMetrics', 'retentionAnalysis']
    });

    return sections;
  }

  async generateCharts(data, reportType) {
    const charts = [];

    // Import data visualization service
    const DataVisualizationService = require('./dataVisualization');
    const visualizationService = new DataVisualizationService();

    switch (reportType) {
      case 'studentProgress':
        charts.push(
          visualizationService.generateChart({
            labels: this.generateTimeLabels(30),
            datasets: [{
              label: 'Progress %',
              data: this.generateMockData(30, 60, 95),
              borderColor: '#007bff',
              backgroundColor: '#007bff20'
            }]
          }, 'line', { title: 'Progress Over Time' })
        );

        charts.push(
          visualizationService.generateChart({
            labels: ['Excellent', 'Good', 'Average', 'Poor'],
            values: [25, 45, 20, 10],
            colors: ['#28a745', '#17a2b8', '#ffc107', '#dc3545']
          }, 'pie', { title: 'Grade Distribution' })
        );
        break;

      case 'instructorPerformance':
        charts.push(
          visualizationService.generateChart({
            labels: ['Course 1', 'Course 2', 'Course 3', 'Course 4'],
            datasets: [{
              label: 'Average Grade',
              data: [85, 78, 92, 88],
              backgroundColor: '#28a745'
            }]
          }, 'bar', { title: 'Course Performance' })
        );
        break;

      case 'platformAnalytics':
        charts.push(
          visualizationService.generateChart({
            labels: this.generateTimeLabels(90),
            datasets: [{
              label: 'Total Users',
              data: this.generateMockData(90, 8000, 12000),
              borderColor: '#007bff',
              backgroundColor: '#007bff20'
            }]
          }, 'line', { title: 'User Growth' })
        );
        break;
    }

    return charts;
  }

  async applyTemplate(content, templateName) {
    // This would typically use a templating engine like Handlebars or Pug
    // For now, return the content as-is with basic formatting
    return {
      ...content,
      template: templateName,
      formatted: true
    };
  }

  async exportReport(reportContent, format, options = {}) {
    const { filename, includeCharts } = options;

    switch (format) {
      case 'pdf':
        return await this.exportToPDF(reportContent, filename, includeCharts);
      case 'excel':
        return await this.exportToExcel(reportContent, filename);
      case 'csv':
        return await this.exportToCSV(reportContent, filename);
      case 'json':
        return await this.exportToJSON(reportContent, filename);
      case 'html':
        return await this.exportToHTML(reportContent, filename, includeCharts);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  async exportToPDF(reportContent, filename, includeCharts) {
    // This would typically use a PDF generation library like PDFKit or Puppeteer
    const pdfContent = this.generatePDFContent(reportContent, includeCharts);
    const filePath = path.join(__dirname, '../../exports', filename);
    
    await fs.writeFile(filePath, pdfContent);
    
    return {
      downloadUrl: `/api/exports/download/${filename}`,
      filename,
      size: Buffer.byteLength(pdfContent),
      format: 'pdf'
    };
  }

  async exportToExcel(reportContent, filename) {
    // This would typically use a library like ExcelJS
    const excelContent = this.generateExcelContent(reportContent);
    const filePath = path.join(__dirname, '../../exports', filename);
    
    await fs.writeFile(filePath, excelContent);
    
    return {
      downloadUrl: `/api/exports/download/${filename}`,
      filename,
      size: Buffer.byteLength(excelContent),
      format: 'excel'
    };
  }

  async exportToCSV(reportContent, filename) {
    const csvContent = this.generateCSVContent(reportContent);
    const filePath = path.join(__dirname, '../../exports', filename);
    
    await fs.writeFile(filePath, csvContent);
    
    return {
      downloadUrl: `/api/exports/download/${filename}`,
      filename,
      size: Buffer.byteLength(csvContent),
      format: 'csv'
    };
  }

  async exportToJSON(reportContent, filename) {
    const jsonContent = JSON.stringify(reportContent, null, 2);
    const filePath = path.join(__dirname, '../../exports', filename);
    
    await fs.writeFile(filePath, jsonContent);
    
    return {
      downloadUrl: `/api/exports/download/${filename}`,
      filename,
      size: Buffer.byteLength(jsonContent),
      format: 'json'
    };
  }

  async exportToHTML(reportContent, filename, includeCharts) {
    const htmlContent = this.generateHTMLContent(reportContent, includeCharts);
    const filePath = path.join(__dirname, '../../exports', filename);
    
    await fs.writeFile(filePath, htmlContent);
    
    return {
      downloadUrl: `/api/exports/download/${filename}`,
      filename,
      size: Buffer.byteLength(htmlContent),
      format: 'html'
    };
  }

  generatePDFContent(reportContent, includeCharts) {
    // Simplified PDF content generation
    return `
    PDF Report: ${reportContent.metadata.reportType}
    Generated: ${reportContent.metadata.generatedAt}
    
    ${reportContent.summary.title}
    
    ${reportContent.sections.map(section => `
    ${section.title}
    ${JSON.stringify(section.content, null, 2)}
    `).join('\n')}
    `;
  }

  generateExcelContent(reportContent) {
    // Simplified Excel content generation
    const csvRows = [];
    
    // Add headers
    csvRows.push('Section,Metric,Value');
    
    // Add summary data
    csvRows.push('Summary,Report Type,' + reportContent.metadata.reportType);
    csvRows.push('Summary,Generated At,' + reportContent.metadata.generatedAt);
    
    // Add section data
    reportContent.sections.forEach(section => {
      Object.keys(section.content).forEach(key => {
        csvRows.push(`${section.title},${key},${JSON.stringify(section.content[key])}`);
      });
    });
    
    return csvRows.join('\n');
  }

  generateCSVContent(reportContent) {
    return this.generateExcelContent(reportContent); // Same format for simplicity
  }

  generateHTMLContent(reportContent, includeCharts) {
    const chartsHTML = includeCharts ? `
      <div class="charts">
        ${reportContent.charts.map(chart => `
          <div class="chart">
            <h3>${chart.chart.options.title}</h3>
            <div class="chart-container" data-config='${JSON.stringify(chart.chart)}'></div>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${reportContent.summary.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .chart { margin: 20px 0; }
        .chart-container { height: 300px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportContent.summary.title}</h1>
        <p>Generated: ${reportContent.metadata.generatedAt}</p>
      </div>
      
      <div class="summary">
        <h2>Executive Summary</h2>
        <p>${JSON.stringify(reportContent.summary.overview, null, 2)}</p>
      </div>
      
      ${chartsHTML}
      
      ${reportContent.sections.map(section => `
        <div class="section">
          <h2>${section.title}</h2>
          <pre>${JSON.stringify(section.content, null, 2)}</pre>
        </div>
      `).join('')}
    </body>
    </html>
    `;
  }

  cacheReport(exportedReport, reportType, data, options) {
    const reportId = uuidv4();
    
    this.reportCache.set(reportId, {
      reportId,
      reportType,
      data,
      options,
      exportedReport,
      cachedAt: Date.now()
    });

    // Clean up expired cache entries
    this.cleanupCache();

    return reportId;
  }

  cleanupCache() {
    const now = Date.now();
    
    for (const [reportId, report] of this.reportCache.entries()) {
      if (now - report.cachedAt > this.cacheTimeout) {
        this.reportCache.delete(reportId);
      }
    }
  }

  async getReport(reportId) {
    const cachedReport = this.reportCache.get(reportId);
    
    if (!cachedReport) {
      throw new Error('Report not found or expired');
    }

    // Check if report is still valid
    if (Date.now() - cachedReport.cachedAt > this.cacheTimeout) {
      this.reportCache.delete(reportId);
      throw new Error('Report has expired');
    }

    return cachedReport;
  }

  async scheduleReport(reportType, schedule, data, options = {}) {
    const scheduledReport = {
      id: uuidv4(),
      reportType,
      schedule,
      data,
      options,
      createdAt: new Date().toISOString(),
      nextRun: this.calculateNextRun(schedule),
      active: true
    };

    // This would typically be stored in a database and processed by a job scheduler
    console.log('Report scheduled:', scheduledReport);

    return {
      success: true,
      scheduledReport
    };
  }

  calculateNextRun(schedule) {
    const now = moment();
    
    switch (schedule.frequency) {
      case 'daily':
        return now.clone().add(1, 'day').startOf('day').toISOString();
      case 'weekly':
        return now.clone().add(1, 'week').startOf('week').toISOString();
      case 'monthly':
        return now.clone().add(1, 'month').startOf('month').toISOString();
      case 'quarterly':
        return now.clone().add(3, 'months').startOf('month').toISOString();
      default:
        return now.clone().add(1, 'day').toISOString();
    }
  }

  // Helper methods
  getReportTitle(reportType) {
    const titles = {
      studentProgress: 'Student Progress Report',
      instructorPerformance: 'Instructor Performance Report',
      platformAnalytics: 'Platform Analytics Report',
      customAnalytics: 'Custom Analytics Report'
    };
    
    return titles[reportType] || 'Analytics Report';
  }

  determineDataRange(data) {
    // This would analyze the data to determine the actual date range
    return {
      start: moment().subtract(30, 'days').toISOString(),
      end: moment().toISOString()
    };
  }

  sanitizeRawData(data) {
    // Remove sensitive information and limit data size
    return JSON.parse(JSON.stringify(data, (key, value) => {
      if (key.includes('password') || key.includes('token') || key.includes('secret')) {
        return '[REDACTED]';
      }
      return value;
    }));
  }

  generateTimeLabels(days) {
    const labels = [];
    const now = moment();
    
    for (let i = days - 1; i >= 0; i--) {
      labels.push(now.clone().subtract(i, 'days').format('MMM DD'));
    }
    
    return labels;
  }

  generateMockData(count, min, max) {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return data;
  }

  generateFilename(reportType, format) {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    return `${reportType}_report_${timestamp}.${format}`;
  }

  // Placeholder methods for section generation
  generateStudentProgressSummary(data) { return { overallProgress: 75 }; }
  getStudentProgressKeyMetrics(data) { return ['Progress: 75%', 'Grade: 85%']; }
  generateInstructorPerformanceSummary(data) { return { totalStudents: 150 }; }
  getInstructorPerformanceKeyMetrics(data) { return ['Students: 150', 'Satisfaction: 4.2']; }
  generatePlatformAnalyticsSummary(data) { return { totalUsers: 10000 }; }
  getPlatformAnalyticsKeyMetrics(data) { return ['Users: 10K', 'Revenue: $100K']; }
  generateGenericSummary(data) { return {}; }
  getGenericKeyMetrics(data) { return []; }
  generateInsights(data, reportType) { return ['Insight 1', 'Insight 2']; }
  generateRecommendations(data, reportType) { return ['Recommendation 1', 'Recommendation 2']; }
  generateCustomAnalyticsSections(data, customFields) { return []; }
  generateGenericSections(data) { return []; }
  generateCustomFieldsSection(customFields, data) { return { title: 'Custom Fields', content: {} }; }
}

module.exports = ReportGenerationService;
