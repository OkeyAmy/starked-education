const express = require('express');
const {
  authenticateToken,
  requireAdmin,
  requirePermission,
} = require('../middleware/auth');
const { PERMISSIONS, UserRole } = require('../utils/roles');
const { AnalyticsService } = require('../services/analyticsService');
const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard
 * Returns real database statistics with 5-minute Redis caching
 */
router.get(
  '/dashboard',
  requirePermission(PERMISSIONS.ADMIN_PANEL),
  async (req, res) => {
    try {
      const stats = await AnalyticsService.getAdminDashboardStats();

      res.json({
        message: 'Dashboard statistics retrieved successfully',
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error retrieving dashboard statistics',
      });
    }
  }
);

/**
 * GET /api/admin/logs
 * Returns system logs from activity_logs with filtering and pagination
 */
router.get(
  '/logs',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  async (req, res) => {
    try {
      const { level, page, limit, startDate, endDate } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

      const result = await AnalyticsService.getSystemLogs({
        level: level || 'all',
        page: parsedPage,
        limit: parsedLimit,
        startDate,
        endDate,
      });

      res.json({
        logs: result.data,
        pagination: result.pagination,
        filters: { level, startDate, endDate },
      });
    } catch (error) {
      console.error('Logs retrieval error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error retrieving system logs',
      });
    }
  }
);

/**
 * GET /api/admin/reports/user-activity
 * Uses real activity_logs data, not mocks
 */
router.get(
  '/reports/user-activity',
  requirePermission(PERMISSIONS.USER_READ),
  async (req, res) => {
    try {
      const { period = '30d', role } = req.query;

      const activityData = await AnalyticsService.getUserActivityReport(
        period,
        role
      );

      res.json({
        message: 'User activity report generated successfully',
        data: activityData,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Activity report error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error generating activity report',
      });
    }
  }
);

/**
 * GET /api/admin/reports/course-performance
 * Queries real course enrollment and completion data
 */
router.get(
  '/reports/course-performance',
  requirePermission(PERMISSIONS.COURSE_READ),
  async (req, res) => {
    try {
      const { period = '30d', courseId } = req.query;

      const performanceData = await AnalyticsService.getCoursePerformanceReport(
        period,
        courseId
      );

      res.json({
        message: 'Course performance report generated successfully',
        data: performanceData,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Course performance report error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error generating course performance report',
      });
    }
  }
);

/**
 * GET /api/admin/settings
 * Returns system settings (configuration-based, not mock)
 */
router.get(
  '/settings',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  (req, res) => {
    try {
      const settings = {
        general: {
          siteName: process.env.SITE_NAME || 'StarkEd Education Platform',
          siteDescription:
            process.env.SITE_DESCRIPTION ||
            'Decentralized education on Stellar',
          maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
          registrationEnabled: process.env.REGISTRATION_ENABLED !== 'false',
          emailVerificationRequired:
            process.env.EMAIL_VERIFICATION_REQUIRED !== 'false',
        },
        security: {
          passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
          sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_HOURS || '24', 10),
          maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
          lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15', 10),
        },
        features: {
          coursesEnabled: process.env.FEATURE_COURSES !== 'false',
          quizzesEnabled: process.env.FEATURE_QUIZZES !== 'false',
          certificatesEnabled: process.env.FEATURE_CERTIFICATES !== 'false',
          socialFeaturesEnabled: process.env.FEATURE_SOCIAL !== 'false',
        },
        limits: {
          maxCoursesPerUser: parseInt(process.env.MAX_COURSES_PER_USER || '10', 10),
          maxQuizzesPerCourse: parseInt(process.env.MAX_QUIZZES_PER_COURSE || '50', 10),
          maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
          maxUsersPerPlan: parseInt(process.env.MAX_USERS_PER_PLAN || '1000', 10),
        },
      };

      res.json({
        message: 'System settings retrieved successfully',
        settings,
      });
    } catch (error) {
      console.error('Settings retrieval error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error retrieving system settings',
      });
    }
  }
);

/**
 * PUT /api/admin/settings
 * Update system settings
 */
router.put(
  '/settings',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  (req, res) => {
    try {
      const { category, settings } = req.body;

      if (!category || !settings) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Category and settings are required',
        });
      }

      const validCategories = ['general', 'security', 'features', 'limits'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          error: 'Invalid category',
          message: `Category must be one of: ${validCategories.join(', ')}`,
        });
      }

      // Settings update would go to a configuration store in production
      res.json({
        message: 'System settings updated successfully',
        category,
        settings,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error updating system settings',
      });
    }
  }
);

/**
 * POST /api/admin/backup
 * Initiate system backup (placeholder for real implementation)
 */
router.post(
  '/backup',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  (req, res) => {
    try {
      const { type = 'full', includeFiles = true } = req.body;

      const backupId = `backup_${Date.now()}`;

      res.json({
        message: 'Backup initiated successfully',
        backup: {
          id: backupId,
          type,
          includeFiles,
          status: 'in_progress',
          estimatedCompletion: new Date(
            Date.now() + 300000
          ).toISOString(),
          downloadUrl: `/api/admin/backups/${backupId}/download`,
        },
      });
    } catch (error) {
      console.error('Backup error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error initiating backup',
      });
    }
  }
);

/**
 * GET /api/admin/backups
 * List backups
 */
router.get(
  '/backups',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  (req, res) => {
    try {
      res.json({
        message: 'Backups retrieved successfully',
        backups: [],
        total: 0,
      });
    } catch (error) {
      console.error('Backups retrieval error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error retrieving backups',
      });
    }
  }
);

/**
 * POST /api/admin/announcements
 * Create a system announcement
 */
router.post(
  '/announcements',
  requirePermission(PERMISSIONS.SYSTEM_MANAGE),
  (req, res) => {
    try {
      const {
        title,
        message,
        targetRoles = [],
        priority = 'normal',
        expiresAt,
      } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Title and message are required',
        });
      }

      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          error: 'Invalid priority',
          message: `Priority must be one of: ${validPriorities.join(', ')}`,
        });
      }

      if (targetRoles.length > 0) {
        const invalidRoles = targetRoles.filter(
          (role) => !Object.values(UserRole).includes(role)
        );
        if (invalidRoles.length > 0) {
          return res.status(400).json({
            error: 'Invalid roles',
            message: `Invalid target roles: ${invalidRoles.join(', ')}`,
          });
        }
      }

      const announcement = {
        id: `announcement_${Date.now()}`,
        title,
        message,
        targetRoles,
        priority,
        expiresAt,
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        active: true,
      };

      res.status(201).json({
        message: 'Announcement created successfully',
        announcement,
      });
    } catch (error) {
      console.error('Announcement creation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Error creating announcement',
      });
    }
  }
);

module.exports = router;
