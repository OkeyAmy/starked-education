/**
 * Data Aggregation Service
 * Queries the PostgreSQL activity_logs table and provides aggregation
 * for dashboard stats, user activity, and course performance.
 */

import { safeQuery } from '../utils/database';
import logger from '../utils/logger';

export interface DashboardStats {
  users: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  courses: {
    total: number;
    published: number;
    enrollments: number;
  };
  activity: {
    totalEvents: number;
    recentActivityCount: number;
    averageDailyActivity: number;
  };
  system: {
    storageUsedMb: number;
    databaseConnections: number;
  };
}

export interface ActivityReport {
  period: string;
  totalActivities: number;
  uniqueUsers: number;
  dailyActivity: { date: string; count: number }[];
  topEventTypes: { type: string; count: number }[];
}

export interface CoursePerformance {
  totalEnrollments: number;
  completedCount: number;
  completionRate: number;
  activeCourses: number;
  topCourses: { courseId: string; enrollments: number }[];
  monthlyTrend: { month: string; enrollments: number; completions: number }[];
}

export interface SystemLog {
  id: number;
  level: string;
  message: string;
  source: string;
  userId: string | null;
  ip: string | null;
  details: string | null;
  timestamp: string;
}

export interface LogQuery {
  level?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class DataAggregationService {
  private static CACHE_TTL = 300; // 5 minutes

  /**
   * Get dashboard statistics from the database
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const results: Partial<DashboardStats> = {
      users: { total: 0, active: 0, newThisMonth: 0 },
      courses: { total: 0, published: 0, enrollments: 0 },
      activity: { totalEvents: 0, recentActivityCount: 0, averageDailyActivity: 0 },
      system: { storageUsedMb: 0, databaseConnections: 0 },
    };

    // --- Event counts from activity_logs ---
    const [totalEventsRes, monthlyEventsRes, uniqueUsersRes] = await Promise.all([
      safeQuery('SELECT COUNT(*) as count FROM activity_logs'),
      safeQuery(
        'SELECT COUNT(*) as count FROM activity_logs WHERE timestamp >= $1',
        [startOfMonth.toISOString()]
      ),
      safeQuery('SELECT COUNT(DISTINCT source_account) as count FROM activity_logs'),
    ]);

    if (totalEventsRes && totalEventsRes.rows.length > 0) {
      results.activity!.totalEvents = parseInt(totalEventsRes.rows[0].count, 10);
    }
    if (monthlyEventsRes && monthlyEventsRes.rows.length > 0) {
      results.activity!.recentActivityCount = parseInt(monthlyEventsRes.rows[0].count, 10);
    }
    if (uniqueUsersRes && uniqueUsersRes.rows.length > 0) {
      results.users!.active = parseInt(uniqueUsersRes.rows[0].count, 10);
    }

    // --- New users this month (distinct new source accounts) ---
    const newUsersRes = await safeQuery(
      'SELECT COUNT(DISTINCT source_account) as count FROM activity_logs WHERE timestamp >= $1',
      [startOfMonth.toISOString()]
    );
    if (newUsersRes && newUsersRes.rows.length > 0) {
      results.users!.newThisMonth = parseInt(newUsersRes.rows[0].count, 10);
    }

    // Total users (distinct source_accounts across all time)
    results.users!.total = results.users!.active || 0;

    // --- Event type breakdown for courses/enrollments ---
    const eventTypesRes = await safeQuery(
      `SELECT type, COUNT(*) as count 
       FROM activity_logs 
       WHERE type IN ('course_enrollment', 'course_completion', 'course_created')
       GROUP BY type`
    );

    if (eventTypesRes && eventTypesRes.rows.length > 0) {
      for (const row of eventTypesRes.rows) {
        if (row.type === 'course_enrollment') {
          results.courses!.enrollments = parseInt(row.count, 10);
        } else if (row.type === 'course_created') {
          results.courses!.total = parseInt(row.count, 10);
          results.courses!.published = parseInt(row.count, 10);
        }
      }
    }

    // --- Database connections ---
    const connRes = await safeQuery(
      "SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()"
    );
    if (connRes && connRes.rows.length > 0) {
      results.system!.databaseConnections = parseInt(connRes.rows[0].count, 10);
    }

    // --- Storage estimate ---
    const storageRes = await safeQuery(
      "SELECT pg_database_size(current_database()) as size_bytes"
    );
    if (storageRes && storageRes.rows.length > 0) {
      results.system!.storageUsedMb = Math.round(
        parseInt(storageRes.rows[0].size_bytes, 10) / (1024 * 1024)
      );
    }

    // Average daily activity (last 7 days)
    const avgDailyRes = await safeQuery(
      `SELECT COUNT(*) as total,
              COUNT(*) / GREATEST(7, 1) as avg
       FROM activity_logs 
       WHERE timestamp >= NOW() - INTERVAL '7 days'`
    );
    if (avgDailyRes && avgDailyRes.rows.length > 0) {
      results.activity!.averageDailyActivity = parseInt(avgDailyRes.rows[0].avg, 10) || 0;
    }

    return results as DashboardStats;
  }

  /**
   * Get system logs from activity_logs with filtering and pagination
   */
  static async getSystemLogs(params: LogQuery): Promise<PaginatedResult<SystemLog>> {
    const {
      level = 'all',
      page = 1,
      limit = 50,
      startDate,
      endDate,
    } = params;

    const offset = (page - 1) * limit;

    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (level && level !== 'all') {
        // Map log levels to activity types
        const levelMap: Record<string, string[]> = {
          info: ['course_enrollment', 'course_completion', 'credential_issuance'],
          warning: ['suspicious_activity'],
          error: ['anomaly_detected'],
        };
        const types = levelMap[level] || [level];
        whereClause += ` AND type = ANY($${paramIndex})`;
        queryParams.push(types);
        paramIndex++;
      }

      if (startDate) {
        whereClause += ` AND timestamp >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND timestamp <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      // Count query
      const countQuery = `SELECT COUNT(*) as total FROM activity_logs ${whereClause}`;
      const countRes = await safeQuery(countQuery, queryParams);

      // Data query
      const dataQuery = `SELECT * FROM activity_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      const dataParams = [...queryParams, limit, offset];
      const dataRes = await safeQuery(dataQuery, dataParams);

      const total = countRes && countRes.rows.length > 0
        ? parseInt(countRes.rows[0].total, 10)
        : 0;

      const logs: SystemLog[] = (dataRes?.rows || []).map((row: any) => ({
        id: row.id,
        level: mapEventTypeToLevel(row.type),
        message: `${row.type}: ${row.operation_id || 'N/A'}`,
        source: row.source_account || 'system',
        userId: row.source_account || null,
        ip: null,
        details: row.details || null,
        timestamp: row.timestamp || row.created_at,
      }));

      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching system logs:', error);
      return {
        data: [],
        pagination: { page, limit, total: 0, pages: 0 },
      };
    }
  }

  /**
   * Get user activity report from real event data
   */
  static async getUserActivityReport(period: string, role?: string): Promise<ActivityReport> {
    const days = periodToDays(period);

    try {
      const dailyActivityRes = await safeQuery(
        `SELECT DATE(timestamp) as date, COUNT(*) as count
         FROM activity_logs
         WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY DATE(timestamp)
         ORDER BY date DESC
         LIMIT $2`,
        [String(days), days]
      );

      const uniqueUsersRes = await safeQuery(
        `SELECT COUNT(DISTINCT source_account) as count
         FROM activity_logs
         WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL`,
        [String(days)]
      );

      const totalActivitiesRes = await safeQuery(
        `SELECT COUNT(*) as count
         FROM activity_logs
         WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL`,
        [String(days)]
      );

      const topTypesRes = await safeQuery(
        `SELECT type, COUNT(*) as count
         FROM activity_logs
         WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY type
         ORDER BY count DESC
         LIMIT 10`,
        [String(days)]
      );

      return {
        period,
        totalActivities: totalActivitiesRes?.rows[0]?.count
          ? parseInt(totalActivitiesRes.rows[0].count, 10)
          : 0,
        uniqueUsers: uniqueUsersRes?.rows[0]?.count
          ? parseInt(uniqueUsersRes.rows[0].count, 10)
          : 0,
        dailyActivity: (dailyActivityRes?.rows || []).map((row: any) => ({
          date: row.date,
          count: parseInt(row.count, 10),
        })),
        topEventTypes: (topTypesRes?.rows || []).map((row: any) => ({
          type: row.type,
          count: parseInt(row.count, 10),
        })),
      };
    } catch (error) {
      logger.error('Error fetching user activity report:', error);
      return {
        period,
        totalActivities: 0,
        uniqueUsers: 0,
        dailyActivity: [],
        topEventTypes: [],
      };
    }
  }

  /**
   * Get course performance report from real data
   */
  static async getCoursePerformanceReport(
    period: string,
    courseId?: string
  ): Promise<CoursePerformance> {
    const days = periodToDays(period);

    try {
      // Enrollment counts
      const enrollmentRes = await safeQuery(
        `SELECT COUNT(*) as count
         FROM activity_logs
         WHERE type = 'course_enrollment'
         AND timestamp >= NOW() - ($1 || ' days')::INTERVAL`,
        [String(days)]
      );

      // Completion counts
      const completionRes = await safeQuery(
        `SELECT COUNT(*) as count
         FROM activity_logs
         WHERE type = 'course_completion'
         AND timestamp >= NOW() - ($1 || ' days')::INTERVAL`,
        [String(days)]
      );

      // Top courses by enrollment
      const topCoursesRes = await safeQuery(
        `SELECT details as course_id, COUNT(*) as count
         FROM activity_logs
         WHERE type = 'course_enrollment'
         AND timestamp >= NOW() - ($1 || ' days')::INTERVAL
         GROUP BY details
         ORDER BY count DESC
         LIMIT 10`,
        [String(days)]
      );

      // Monthly trends
      const monthlyTrendRes = await safeQuery(
        `SELECT 
           DATE_TRUNC('month', timestamp) as month,
           COUNT(*) FILTER (WHERE type = 'course_enrollment') as enrollments,
           COUNT(*) FILTER (WHERE type = 'course_completion') as completions
         FROM activity_logs
         WHERE timestamp >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', timestamp)
         ORDER BY month DESC`
      );

      const totalEnrollments = enrollmentRes?.rows[0]?.count
        ? parseInt(enrollmentRes.rows[0].count, 10)
        : 0;
      const completedCount = completionRes?.rows[0]?.count
        ? parseInt(completionRes.rows[0].count, 10)
        : 0;

      return {
        totalEnrollments,
        completedCount,
        completionRate: totalEnrollments > 0
          ? Math.round((completedCount / totalEnrollments) * 100)
          : 0,
        activeCourses: topCoursesRes?.rows?.length || 0,
        topCourses: (topCoursesRes?.rows || []).map((row: any) => ({
          courseId: row.course_id || 'unknown',
          enrollments: parseInt(row.count, 10),
        })),
        monthlyTrend: (monthlyTrendRes?.rows || []).map((row: any) => ({
          month: row.month instanceof Date ? row.month.toISOString().split('T')[0] : String(row.month),
          enrollments: parseInt(row.enrollments, 10) || 0,
          completions: parseInt(row.completions, 10) || 0,
        })),
      };
    } catch (error) {
      logger.error('Error fetching course performance report:', error);
      return {
        totalEnrollments: 0,
        completedCount: 0,
        completionRate: 0,
        activeCourses: 0,
        topCourses: [],
        monthlyTrend: [],
      };
    }
  }

  /**
   * Get course completion stats (kept for backward compatibility)
   */
  static async getCourseCompletionStats(courseId: string): Promise<any> {
    try {
      const res = await safeQuery(
        `SELECT 
           COUNT(*) FILTER (WHERE type = 'course_enrollment') as enrolled,
           COUNT(*) FILTER (WHERE type = 'course_completion') as completed
         FROM activity_logs
         WHERE details = $1`,
        [courseId]
      );

      const enrolled = res?.rows[0]?.enrolled
        ? parseInt(res.rows[0].enrolled, 10)
        : 0;
      const completed = res?.rows[0]?.completed
        ? parseInt(res.rows[0].completed, 10)
        : 0;

      return {
        courseId,
        totalEnrolled: enrolled,
        activeLearners: enrolled,
        averageCompletion: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        averageQuizScore: 0,
        completionRate: enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0,
        timeSpentAverage: 0,
        distribution: {
          '0-25%': 0,
          '26-50%': 0,
          '51-75%': 0,
          '76-100%': 0,
        },
      };
    } catch (error) {
      logger.error(`Error fetching course completion stats for ${courseId}:`, error);
      return {
        courseId,
        totalEnrolled: 0,
        activeLearners: 0,
        averageCompletion: 0,
        averageQuizScore: 0,
        completionRate: 0,
        timeSpentAverage: 0,
        distribution: {},
      };
    }
  }

  // --- Compatibility stubs for existing AnalyticsService usage ---

  static async getUserDailyActivity(userId: string, days: number): Promise<any[]> {
    try {
      const res = await safeQuery(
        `SELECT DATE(timestamp) as date, COUNT(*) as count
         FROM activity_logs
         WHERE source_account = $1
         AND timestamp >= NOW() - ($2 || ' days')::INTERVAL
         GROUP BY DATE(timestamp)
         ORDER BY date DESC`,
        [userId, String(days)]
      );

      return (res?.rows || []).map((row: any) => ({
        date: row.date,
        lessons_completed: parseInt(row.count, 10),
        time_spent: 0,
        quiz_score: 0,
      }));
    } catch (error) {
      logger.error(`Error fetching user daily activity for ${userId}:`, error);
      return [];
    }
  }

  static async getUserTimeAnalysis(userId: string): Promise<any> {
    return {
      totalTime: 0,
      avgSessionDuration: 0,
      timeByCourse: [],
      timeByDay: [],
      mostActiveTime: 'N/A',
    };
  }

  static async getUserCourseCompletion(userId: string): Promise<any[]> {
    try {
      const res = await safeQuery(
        `SELECT details as course_id, type, timestamp
         FROM activity_logs
         WHERE source_account = $1
         AND type IN ('course_enrollment', 'course_completion')
         ORDER BY timestamp DESC`,
        [userId]
      );

      return (res?.rows || []).map((row: any) => ({
        courseId: row.course_id || 'unknown',
        title: row.course_id || 'Unknown Course',
        progress: row.type === 'course_completion' ? 100 : 0,
        score: 0,
        status: row.type === 'course_completion' ? 'completed' : 'in_progress',
        completedAt: row.type === 'course_completion' ? row.timestamp : undefined,
        lastAccessed: row.timestamp,
      }));
    } catch (error) {
      logger.error(`Error fetching user course completion for ${userId}:`, error);
      return [];
    }
  }

  static async getQuizPerformanceAnalytics(quizId: string): Promise<any> {
    return {
      quizId,
      totalSubmissions: 0,
      averageScore: 0,
      passRate: 0,
      questionDifficulty: [],
      scoreDistribution: [],
      learningOutcomes: [],
    };
  }
}

// --- Helper functions ---

function mapEventTypeToLevel(type: string): string {
  const levelMap: Record<string, string> = {
    course_enrollment: 'info',
    course_completion: 'info',
    credential_issuance: 'info',
    user_achievement: 'info',
    profile_update: 'info',
    suspicious_activity: 'warning',
    anomaly_detected: 'error',
    failed_login: 'warning',
    system_error: 'error',
  };
  return levelMap[type] || 'info';
}

function periodToDays(period: string): number {
  const map: Record<string, number> = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '60d': 60,
    '90d': 90,
    '180d': 180,
    '1y': 365,
  };
  return map[period] || 30;
}
