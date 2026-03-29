const _ = require('lodash');
const moment = require('moment');

class DataVisualizationService {
  constructor() {
    this.chartTypes = {
      line: 'line',
      bar: 'bar',
      pie: 'pie',
      doughnut: 'doughnut',
      radar: 'radar',
      scatter: 'scatter',
      bubble: 'bubble',
      polarArea: 'polarArea',
      heatmap: 'heatmap',
      gauge: 'gauge',
      funnel: 'funnel',
      sankey: 'sankey'
    };

    this.colorSchemes = {
      primary: ['#007bff', '#0056b3', '#004085', '#002752', '#001233'],
      success: ['#28a745', '#1e7e34', '#155724', '#0c3e1c', '#06250f'],
      warning: ['#ffc107', '#e0a800', '#d39e00', '#b08d00', '#8c7c00'],
      danger: ['#dc3545', '#c82333', '#bd2130', '#a71e2a', '#8b1a1f'],
      info: ['#17a2b8', '#138496', '#117a8b', '#0c5460', '#062c33'],
      rainbow: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'],
      pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E0BBE4'],
      monochrome: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7', '#ECF0F1']
    };

    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#ddd',
          borderWidth: 1,
          cornerRadius: 4,
          displayColors: true
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    };
  }

  generateChart(data, chartType, options = {}) {
    try {
      const chartConfig = this.createChartConfig(data, chartType, options);
      return {
        success: true,
        chart: chartConfig,
        metadata: {
          type: chartType,
          dataPoints: this.countDataPoints(data),
          generatedAt: new Date().toISOString(),
          options: options
        }
      };
    } catch (error) {
      console.error('Error generating chart:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createChartConfig(data, chartType, options) {
    const baseConfig = {
      type: chartType,
      data: this.formatDataForChart(data, chartType),
      options: this.mergeChartOptions(chartType, options)
    };

    // Add chart-specific configurations
    switch (chartType) {
      case 'line':
        return this.configureLineChart(baseConfig, options);
      case 'bar':
        return this.configureBarChart(baseConfig, options);
      case 'pie':
      case 'doughnut':
        return this.configurePieChart(baseConfig, options);
      case 'radar':
        return this.configureRadarChart(baseConfig, options);
      case 'scatter':
        return this.configureScatterChart(baseConfig, options);
      case 'heatmap':
        return this.configureHeatmap(baseConfig, options);
      case 'gauge':
        return this.configureGauge(baseConfig, options);
      case 'funnel':
        return this.configureFunnel(baseConfig, options);
      default:
        return baseConfig;
    }
  }

  formatDataForChart(data, chartType) {
    switch (chartType) {
      case 'line':
      case 'bar':
        return this.formatXYData(data);
      case 'pie':
      case 'doughnut':
        return this.formatPieData(data);
      case 'radar':
        return this.formatRadarData(data);
      case 'scatter':
        return this.formatScatterData(data);
      case 'heatmap':
        return this.formatHeatmapData(data);
      case 'gauge':
        return this.formatGaugeData(data);
      case 'funnel':
        return this.formatFunnelData(data);
      default:
        return data;
    }
  }

  formatXYData(data) {
    if (!data.labels || !data.datasets) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        backgroundColor: dataset.backgroundColor || this.getColor(index, 0.2),
        borderColor: dataset.borderColor || this.getColor(index, 1),
        borderWidth: dataset.borderWidth || 2,
        fill: dataset.fill || false,
        tension: dataset.tension || 0.4,
        pointRadius: dataset.pointRadius || 4,
        pointHoverRadius: dataset.pointHoverRadius || 6,
        ...dataset
      }))
    };
  }

  formatPieData(data) {
    if (!data.labels || !data.values) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: [{
        data: data.values,
        backgroundColor: data.colors || this.generateColorPalette(data.labels.length),
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 4
      }]
    };
  }

  formatRadarData(data) {
    if (!data.labels || !data.datasets) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        backgroundColor: dataset.backgroundColor || this.getColor(index, 0.2),
        borderColor: dataset.borderColor || this.getColor(index, 1),
        borderWidth: dataset.borderWidth || 2,
        pointBackgroundColor: dataset.pointBackgroundColor || this.getColor(index, 1),
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: this.getColor(index, 1),
        ...dataset
      }))
    };
  }

  formatScatterData(data) {
    if (!data.datasets) {
      return { datasets: [] };
    }

    return {
      datasets: data.datasets.map((dataset, index) => ({
        label: dataset.label || `Dataset ${index + 1}`,
        data: dataset.data || [],
        backgroundColor: dataset.backgroundColor || this.getColor(index, 0.6),
        borderColor: dataset.borderColor || this.getColor(index, 1),
        borderWidth: dataset.borderWidth || 1,
        pointRadius: dataset.pointRadius || 5,
        pointHoverRadius: dataset.pointHoverRadius || 7,
        ...dataset
      }))
    };
  }

  formatHeatmapData(data) {
    if (!data.data || !data.xLabels || !data.yLabels) {
      return { datasets: [] };
    }

    return {
      labels: {
        x: data.xLabels,
        y: data.yLabels
      },
      datasets: [{
        label: data.label || 'Heatmap',
        data: data.data,
        backgroundColor: (context) => {
          const value = context.dataset.data[context.dataIndex];
          return this.getHeatmapColor(value, data.minValue || 0, data.maxValue || 100);
        },
        borderWidth: 1,
        borderColor: '#fff'
      }]
    };
  }

  formatGaugeData(data) {
    if (!data.value) {
      return { datasets: [] };
    }

    const percentage = Math.min(Math.max(data.value, 0), 100);
    const remaining = 100 - percentage;

    return {
      datasets: [{
        data: [percentage, remaining],
        backgroundColor: [
          this.getGaugeColor(percentage),
          '#e9ecef'
        ],
        borderWidth: 0,
        hoverOffset: 0
      }]
    };
  }

  formatFunnelData(data) {
    if (!data.labels || !data.values) {
      return { labels: [], datasets: [] };
    }

    return {
      labels: data.labels,
      datasets: [{
        label: data.label || 'Funnel',
        data: data.values,
        backgroundColor: data.colors || this.generateColorPalette(data.labels.length, 0.8),
        borderColor: data.borderColor || '#fff',
        borderWidth: data.borderWidth || 2
      }]
    };
  }

  mergeChartOptions(chartType, customOptions) {
    const baseOptions = _.cloneDeep(this.defaultOptions);
    const typeSpecificOptions = this.getTypeSpecificOptions(chartType);
    
    return _.merge({}, baseOptions, typeSpecificOptions, customOptions);
  }

  getTypeSpecificOptions(chartType) {
    switch (chartType) {
      case 'line':
        return {
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          },
          elements: {
            line: {
              tension: 0.4
            }
          }
        };

      case 'bar':
        return {
          scales: {
            x: {
              display: true,
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };

      case 'pie':
      case 'doughnut':
        return {
          cutout: chartType === 'doughnut' ? '50%' : 0,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        };

      case 'radar':
        return {
          scales: {
            r: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };

      case 'scatter':
        return {
          scales: {
            x: {
              type: 'linear',
              position: 'bottom',
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(0, 0, 0, 0.1)'
              }
            }
          }
        };

      default:
        return {};
    }
  }

  configureLineChart(config, options) {
    if (options.stacked) {
      config.options.scales.y.stacked = true;
      config.options.scales.x.stacked = true;
    }

    if (options.fillArea) {
      config.data.datasets.forEach(dataset => {
        dataset.fill = true;
      });
    }

    return config;
  }

  configureBarChart(config, options) {
    if (options.horizontal) {
      config.options.indexAxis = 'y';
    }

    if (options.stacked) {
      config.options.scales.x.stacked = true;
      config.options.scales.y.stacked = true;
    }

    return config;
  }

  configurePieChart(config, options) {
    if (options.explode) {
      config.data.datasets[0].offset = config.data.datasets[0].data.map((value, index) => 
        options.explode === true || options.explode === index ? 10 : 0
      );
    }

    return config;
  }

  configureRadarChart(config, options) {
    if (options.fill) {
      config.data.datasets.forEach(dataset => {
        dataset.fill = true;
      });
    }

    return config;
  }

  configureScatterChart(config, options) {
    // Scatter chart specific configurations
    return config;
  }

  configureHeatmap(config, options) {
    // Heatmap specific configurations
    return config;
  }

  configureGauge(config, options) {
    config.type = 'doughnut';
    config.options.circumference = 180;
    config.options.rotation = 270;
    config.options.cutout = '75%';
    
    config.options.plugins = {
      ...config.options.plugins,
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    };

    return config;
  }

  configureFunnel(config, options) {
    config.type = 'bar';
    config.options.indexAxis = 'y';
    
    config.options.plugins = {
      ...config.options.plugins,
      legend: {
        display: false
      }
    };

    return config;
  }

  generateDashboard(analyticsData, layout = 'grid') {
    try {
      const dashboard = {
        id: this.generateId(),
        title: 'Analytics Dashboard',
        layout: layout,
        generatedAt: new Date().toISOString(),
        charts: [],
        widgets: [],
        filters: this.generateFilters(analyticsData),
        refreshInterval: 300000, // 5 minutes
        responsive: true
      };

      // Generate charts based on data type
      if (analyticsData.studentAnalytics) {
        dashboard.charts.push(...this.generateStudentCharts(analyticsData.studentAnalytics));
      }

      if (analyticsData.instructorAnalytics) {
        dashboard.charts.push(...this.generateInstructorCharts(analyticsData.instructorAnalytics));
      }

      if (analyticsData.platformAnalytics) {
        dashboard.charts.push(...this.generatePlatformCharts(analyticsData.platformAnalytics));
      }

      // Generate summary widgets
      dashboard.widgets = this.generateSummaryWidgets(analyticsData);

      return {
        success: true,
        dashboard
      };

    } catch (error) {
      console.error('Error generating dashboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  generateStudentCharts(studentData) {
    const charts = [];

    // Progress over time
    if (studentData.progress && studentData.progress.overall) {
      charts.push(this.generateChart({
        labels: this.generateTimeLabels(30),
        datasets: [{
          label: 'Progress %',
          data: this.generateMockData(30, 60, 95),
          borderColor: this.colorSchemes.primary[0],
          backgroundColor: this.colorSchemes.primary[0] + '20'
        }]
      }, 'line', {
        title: 'Progress Over Time',
        yAxisTitle: 'Progress (%)'
      }));
    }

    // Performance by course
    if (studentData.performance && studentData.performance.byCourse) {
      charts.push(this.generateChart({
        labels: ['Course 1', 'Course 2', 'Course 3', 'Course 4'],
        datasets: [{
          label: 'Average Grade',
          data: [85, 78, 92, 88],
          backgroundColor: this.colorSchemes.success
        }]
      }, 'bar', {
        title: 'Performance by Course',
        yAxisTitle: 'Grade (%)'
      }));
    }

    // Engagement breakdown
    if (studentData.engagement) {
      charts.push(this.generateChart({
        labels: ['Videos', 'Quizzes', 'Assignments', 'Forum', 'Live Sessions'],
        values: [35, 25, 20, 15, 5],
        colors: this.colorSchemes.rainbow.slice(0, 5)
      }, 'doughnut', {
        title: 'Engagement by Activity Type'
      }));
    }

    // Time spent by subject
    if (studentData.timeSpent && studentData.timeSpent.byCourse) {
      charts.push(this.generateChart({
        labels: ['Math', 'Science', 'History', 'English', 'Art'],
        datasets: [{
          label: 'Hours Spent',
          data: [12, 8, 6, 10, 4],
          backgroundColor: this.colorSchemes.info
        }]
      }, 'bar', {
        title: 'Time Spent by Subject',
        yAxisTitle: 'Hours'
      }));
    }

    return charts;
  }

  generateInstructorCharts(instructorData) {
    const charts = [];

    // Class performance overview
    if (instructorData.studentPerformance) {
      charts.push(this.generateChart({
        labels: this.generateTimeLabels(14),
        datasets: [{
          label: 'Average Grade',
          data: this.generateMockData(14, 75, 90),
          borderColor: this.colorSchemes.success[0],
          backgroundColor: this.colorSchemes.success[0] + '20'
        }, {
          label: 'Engagement Score',
          data: this.generateMockData(14, 60, 85),
          borderColor: this.colorSchemes.info[0],
          backgroundColor: this.colorSchemes.info[0] + '20'
        }]
      }, 'line', {
        title: 'Class Performance Trends'
      }));
    }

    // Grade distribution
    if (instructorData.studentPerformance && instructorData.studentPerformance.gradeDistribution) {
      charts.push(this.generateChart({
        labels: ['A', 'B', 'C', 'D', 'F'],
        values: [25, 35, 25, 10, 5],
        colors: this.colorSchemes.success.concat(this.colorSchemes.warning, this.colorSchemes.danger)
      }, 'pie', {
        title: 'Grade Distribution'
      }));
    }

    // Student engagement metrics
    if (instructorData.engagement) {
      charts.push(this.generateChart({
        labels: ['Login Frequency', 'Session Duration', 'Forum Activity', 'Assignment Submission'],
        datasets: [{
          label: 'Engagement Score',
          data: [0.8, 0.7, 0.6, 0.9],
          backgroundColor: this.colorSchemes.primary
        }]
      }, 'radar', {
        title: 'Student Engagement Metrics'
      }));
    }

    return charts;
  }

  generatePlatformCharts(platformData) {
    const charts = [];

    // User growth
    if (platformData.growthMetrics) {
      charts.push(this.generateChart({
        labels: this.generateTimeLabels(90),
        datasets: [{
          label: 'Total Users',
          data: this.generateMockData(90, 8000, 12000),
          borderColor: this.colorSchemes.primary[0],
          backgroundColor: this.colorSchemes.primary[0] + '20'
        }, {
          label: 'Active Users',
          data: this.generateMockData(90, 5000, 8000),
          borderColor: this.colorSchemes.success[0],
          backgroundColor: this.colorSchemes.success[0] + '20'
        }]
      }, 'line', {
        title: 'User Growth Trends'
      }));
    }

    // Revenue analytics
    if (platformData.financialAnalytics) {
      charts.push(this.generateChart({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'Revenue',
          data: [80000, 85000, 92000, 88000, 95000, 100000],
          backgroundColor: this.colorSchemes.success
        }]
      }, 'bar', {
        title: 'Monthly Revenue',
        yAxisTitle: 'Revenue ($)'
      }));
    }

    // Course popularity
    if (platformData.courseAnalytics) {
      charts.push(this.generateChart({
        labels: ['Programming', 'Design', 'Business', 'Marketing', 'Data Science'],
        values: [350, 280, 220, 180, 150],
        colors: this.colorSchemes.rainbow.slice(0, 5)
      }, 'doughnut', {
        title: 'Course Categories by Enrollment'
      }));
    }

    return charts;
  }

  generateSummaryWidgets(analyticsData) {
    const widgets = [];

    // Overview widgets
    if (analyticsData.overview) {
      widgets.push({
        id: this.generateId(),
        type: 'metric',
        title: 'Total Users',
        value: analyticsData.overview.totalUsers || 0,
        change: '+12%',
        changeType: 'positive',
        icon: 'users',
        color: 'primary'
      });

      widgets.push({
        id: this.generateId(),
        type: 'metric',
        title: 'Active Courses',
        value: analyticsData.overview.activeCourses || 0,
        change: '+5%',
        changeType: 'positive',
        icon: 'book',
        color: 'success'
      });

      widgets.push({
        id: this.generateId(),
        type: 'metric',
        title: 'Revenue',
        value: `$${(analyticsData.overview.totalRevenue || 0).toLocaleString()}`,
        change: '+18%',
        changeType: 'positive',
        icon: 'dollar',
        color: 'info'
      });

      widgets.push({
        id: this.generateId(),
        type: 'metric',
        title: 'Engagement Rate',
        value: `${(analyticsData.overview.engagementRate || 0).toFixed(1)}%`,
        change: '+3%',
        changeType: 'positive',
        icon: 'chart-line',
        color: 'warning'
      });
    }

    return widgets;
  }

  generateFilters(analyticsData) {
    return [
      {
        id: 'timeframe',
        type: 'select',
        label: 'Timeframe',
        options: [
          { value: 'day', label: 'Today' },
          { value: 'week', label: 'This Week' },
          { value: 'month', label: 'This Month' },
          { value: 'quarter', label: 'This Quarter' },
          { value: 'year', label: 'This Year' }
        ],
        defaultValue: 'month'
      },
      {
        id: 'course',
        type: 'multiselect',
        label: 'Courses',
        options: [
          { value: 'all', label: 'All Courses' },
          { value: 'active', label: 'Active Courses' },
          { value: 'completed', label: 'Completed Courses' }
        ],
        defaultValue: ['all']
      },
      {
        id: 'userType',
        type: 'radio',
        label: 'User Type',
        options: [
          { value: 'all', label: 'All Users' },
          { value: 'students', label: 'Students' },
          { value: 'instructors', label: 'Instructors' }
        ],
        defaultValue: 'all'
      }
    ];
  }

  // Utility methods
  getColor(index, alpha = 1) {
    const scheme = this.colorSchemes.primary;
    const color = scheme[index % scheme.length];
    
    if (alpha < 1) {
      // Convert hex to rgba
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    return color;
  }

  generateColorPalette(count, alpha = 1) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      colors.push(this.getColor(i, alpha));
    }
    return colors;
  }

  getHeatmapColor(value, min, max) {
    const ratio = (value - min) / (max - min);
    
    if (ratio < 0.25) return this.colorSchemes.info[3];
    if (ratio < 0.5) return this.colorSchemes.warning[2];
    if (ratio < 0.75) return this.colorSchemes.warning[1];
    return this.colorSchemes.success[1];
  }

  getGaugeColor(value) {
    if (value < 30) return this.colorSchemes.danger[0];
    if (value < 60) return this.colorSchemes.warning[0];
    return this.colorSchemes.success[0];
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

  countDataPoints(data) {
    if (data.datasets) {
      return data.datasets.reduce((total, dataset) => {
        return total + (dataset.data ? dataset.data.length : 0);
      }, 0);
    }
    return data.values ? data.values.length : 0;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Export methods
  exportChart(chartConfig, format = 'png') {
    return {
      success: true,
      exportUrl: `/api/charts/export/${this.generateId()}.${format}`,
      format,
      filename: `chart_${moment().format('YYYY-MM-DD_HH-mm-ss')}.${format}`
    };
  }

  exportDashboard(dashboard, format = 'pdf') {
    return {
      success: true,
      exportUrl: `/api/dashboards/export/${dashboard.id}.${format}`,
      format,
      filename: `dashboard_${dashboard.title}_${moment().format('YYYY-MM-DD_HH-mm-ss')}.${format}`
    };
  }
}

module.exports = DataVisualizationService;
