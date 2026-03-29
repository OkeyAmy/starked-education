const Tenant = require('../models/Tenant');
const TenantUser = require('../models/TenantUser');
const mongoose = require('mongoose');

class TenantAnalyticsService {
  /**
   * Get aggregated analytics across all tenants (privacy-preserving)
   */
  async getCrossTenantAnalytics(dateRange = '30d') {
    try {
      const startDate = this.getDateRangeStart(dateRange);
      
      // Basic tenant metrics
      const totalTenants = await Tenant.countDocuments({ createdAt: { $gte: startDate } });
      const activeTenants = await Tenant.countDocuments({
        status: 'active',
        createdAt: { $gte: startDate }
      });
      
      // Get all tenants for aggregation
      const tenants = await Tenant.find({ createdAt: { $gte: startDate } });
      
      // Calculate aggregated metrics
      const totalUsers = tenants.reduce((sum, tenant) => sum + tenant.usage.users, 0);
      const totalStorage = tenants.reduce((sum, tenant) => sum + tenant.usage.storage, 0);
      const totalApiCalls = tenants.reduce((sum, tenant) => sum + tenant.usage.apiCalls, 0);
      
      // Group by plan
      const tenantsByPlan = tenants.reduce((acc, tenant) => {
        acc[tenant.plan] = (acc[tenant.plan] || 0) + 1;
        return acc;
      }, {});
      
      // User engagement metrics
      const totalActiveUsers = await TenantUser.countDocuments({
        'activity.lastActive': { $gte: startDate }
      });
      
      const userStats = await TenantUser.aggregate([
        {
          $match: {
            'activity.lastActive': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            averageLoginFrequency: { $avg: '$activity.totalLogins' },
            averageTimeSpent: { $avg: '$activity.totalTimeSpent' },
            coursesCompleted: { $sum: '$activity.coursesCompleted' },
            certificatesEarned: { $sum: '$activity.certificatesEarned' }
          }
        }
      ]);

      // Growth metrics over time
      const growthMetrics = await this.getGrowthMetrics(startDate);

      // Geographic distribution (anonymized sample data)
      const geographicData = [
        { region: 'North America', users: 1250, percentage: 35 },
        { region: 'Europe', users: 980, percentage: 27 },
        { region: 'Asia', users: 850, percentage: 24 },
        { region: 'South America', users: 320, percentage: 9 },
        { region: 'Africa', users: 150, percentage: 4 },
        { region: 'Oceania', users: 80, percentage: 2 }
      ];

      // Device analytics (anonymized sample data)
      const deviceAnalytics = {
        devices: [
          { type: 'Desktop', users: 2100, percentage: 58 },
          { type: 'Mobile', users: 1200, percentage: 33 },
          { type: 'Tablet', users: 300, percentage: 9 }
        ],
        browsers: [
          { name: 'Chrome', users: 1800, percentage: 50 },
          { name: 'Safari', users: 900, percentage: 25 },
          { name: 'Firefox', users: 540, percentage: 15 },
          { name: 'Edge', users: 360, percentage: 10 }
        ]
      };

      return {
        summary: {
          totalTenants,
          activeTenants,
          tenantsByPlan,
          totalUsers,
          totalStorage,
          totalApiCalls,
          averageUsersPerTenant: totalTenants > 0 ? Math.round(totalUsers / totalTenants) : 0,
          averageStoragePerTenant: totalTenants > 0 ? Math.round(totalStorage / totalTenants) : 0
        },
        userEngagement: {
          totalActiveUsers,
          averageLoginFrequency: Math.round((userStats[0]?.averageLoginFrequency || 0) * 100) / 100,
          averageTimeSpent: Math.round((userStats[0]?.averageTimeSpent || 0) * 100) / 100,
          coursesCompleted: userStats[0]?.coursesCompleted || 0,
          certificatesEarned: userStats[0]?.certificatesEarned || 0
        },
        growthMetrics,
        geographicData,
        deviceAnalytics,
        period: dateRange,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get cross-tenant analytics: ${error.message}`);
    }
  }

  /**
   * Get tenant-specific analytics (for tenant admins)
   */
  async getTenantAnalytics(tenantId, dateRange = '30d') {
    try {
      const startDate = this.getDateRangeStart(dateRange);
      
      // Verify tenant exists
      const tenant = await Tenant.findById(tenantId);
      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // User metrics for this tenant
      const totalUsers = await TenantUser.countDocuments({ tenantId });
      const activeUsers = await TenantUser.countDocuments({
        tenantId,
        'activity.lastActive': { $gte: startDate }
      });

      // Users by status
      const usersByStatus = await TenantUser.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      // Users by role
      const usersByRole = await TenantUser.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        { $unwind: '$roles' },
        { $group: { _id: '$roles', count: { $sum: 1 } } }
      ]);

      // Activity metrics
      const activityStats = await TenantUser.aggregate([
        { $match: { tenantId: new mongoose.Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: null,
            totalLogins: { $sum: '$activity.totalLogins' },
            totalTimeSpent: { $sum: '$activity.totalTimeSpent' },
            coursesCompleted: { $sum: '$activity.coursesCompleted' },
            certificatesEarned: { $sum: '$activity.certificatesEarned' }
          }
        }
      ]);

      // Activity trends over time
      const activityTrends = await TenantUser.aggregate([
        {
          $match: {
            tenantId: new mongoose.Types.ObjectId(tenantId),
            'activity.lastActive': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$activity.lastActive'
              }
            },
            activeUsers: { $sum: 1 },
            totalLogins: { $sum: '$activity.totalLogins' },
            totalTimeSpent: { $sum: '$activity.totalTimeSpent' }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Usage statistics
      const usageStats = {
        current: tenant.usage,
        limits: {
          maxUsers: tenant.settings.maxUsers,
          maxStorage: tenant.settings.maxStorage
        },
        utilization: {
          users: Math.round((tenant.usage.users / tenant.settings.maxUsers) * 100),
          storage: Math.round((tenant.usage.storage / tenant.settings.maxStorage) * 100)
        }
      };

      return {
        tenant: {
          id: tenant._id,
          name: tenant.name,
          plan: tenant.plan,
          status: tenant.status
        },
        userMetrics: {
          totalUsers,
          activeUsers,
          usersByStatus: usersByStatus.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          usersByRole: usersByRole.reduce((acc, stat) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {}),
          totalLogins: activityStats[0]?.totalLogins || 0,
          totalTimeSpent: activityStats[0]?.totalTimeSpent || 0,
          coursesCompleted: activityStats[0]?.coursesCompleted || 0,
          certificatesEarned: activityStats[0]?.certificatesEarned || 0
        },
        activityTrends,
        usageStats,
        period: dateRange,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get tenant analytics: ${error.message}`);
    }
  }

  /**
   * Get growth metrics over time
   */
  async getGrowthMetrics(startDate) {
    try {
      // Daily tenant growth
      const dailyGrowth = await Tenant.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            newTenants: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      // Daily user growth
      const userGrowth = await TenantUser.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            newUsers: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      return {
        tenantGrowth: dailyGrowth,
        userGrowth
      };
    } catch (error) {
      throw new Error(`Failed to get growth metrics: ${error.message}`);
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(tenantId = null) {
    try {
      // API response times (would typically come from monitoring system)
      const apiMetrics = {
        averageResponseTime: 145, // ms
        p95ResponseTime: 320, // ms
        p99ResponseTime: 580, // ms
        uptime: 99.9, // percentage
        errorRate: 0.2 // percentage
      };

      // Database performance
      const dbMetrics = {
        averageQueryTime: 25, // ms
        connectionsActive: 45,
        connectionsMax: 100,
        indexHitRatio: 98.5 // percentage
      };

      // Resource utilization
      const resourceMetrics = {
        cpuUsage: 42.3, // percentage
        memoryUsage: 67.8, // percentage
        diskUsage: 35.2, // percentage
        networkIO: {
          inbound: 125.6, // MB/s
          outbound: 89.3 // MB/s
        }
      };

      return {
        api: apiMetrics,
        database: dbMetrics,
        resources: resourceMetrics,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  /**
   * Generate analytics report
   */
  async generateReport(tenantId = null, reportType = 'summary', dateRange = '30d') {
    try {
      let reportData;

      switch (reportType) {
        case 'cross-tenant':
          reportData = await this.getCrossTenantAnalytics(dateRange);
          break;
        case 'tenant-specific':
          if (!tenantId) {
            throw new Error('Tenant ID required for tenant-specific reports');
          }
          reportData = await this.getTenantAnalytics(tenantId, dateRange);
          break;
        case 'performance':
          reportData = await this.getPerformanceMetrics(tenantId);
          break;
        default:
          reportData = await this.getCrossTenantAnalytics(dateRange);
      }

      return {
        reportType,
        dateRange,
        data: reportData,
        generatedAt: new Date(),
        generatedBy: 'system'
      };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error.message}`);
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportData(tenantId = null, format = 'json', dateRange = '30d') {
    try {
      const data = await this.generateReport(tenantId, 'summary', dateRange);

      switch (format.toLowerCase()) {
        case 'csv':
          return this.convertToCSV(data.data);
        case 'xlsx':
          return this.convertToXLSX(data.data);
        case 'pdf':
          return this.convertToPDF(data.data);
        default:
          return data;
      }
    } catch (error) {
      throw new Error(`Failed to export data: ${error.message}`);
    }
  }

  /**
   * Helper method to get date range start
   */
  getDateRangeStart(range) {
    const now = new Date();
    switch (range) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simple CSV conversion - in production, use a proper CSV library
    return 'CSV export functionality to be implemented';
  }

  /**
   * Convert data to XLSX format
   */
  convertToXLSX(data) {
    // XLSX conversion - in production, use a library like xlsx
    return 'XLSX export functionality to be implemented';
  }

  /**
   * Convert data to PDF format
   */
  convertToPDF(data) {
    // PDF conversion - in production, use a library like puppeteer
    return 'PDF export functionality to be implemented';
  }
}

module.exports = new TenantAnalyticsService();
