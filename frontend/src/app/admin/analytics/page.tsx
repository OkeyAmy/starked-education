'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  Trophy,
  Clock,
  Download,
  Calendar,
  Filter,
  Activity,
  Target,
  Zap
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    totalCompletions: number;
    averageScore: number;
    totalRevenue: number;
  };
  userAnalytics: {
    daily: Array<{ date: string; users: number; signups: number }>;
    retention: Array<{ period: string; rate: number }>;
    demographics: {
      byRole: Record<string, number>;
      byRegion: Record<string, number>;
    };
  };
  courseAnalytics: {
    popularCourses: Array<{
      id: string;
      title: string;
      enrollments: number;
      completions: number;
      rating: number;
    }>;
    categoryPerformance: Array<{
      category: string;
      courses: number;
      enrollments: number;
      completionRate: number;
    }>;
    completionTrends: Array<{ date: string; completions: number }>;
  };
  systemPerformance: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    storageUsage: {
      used: number;
      total: number;
    };
  };
}

export default function AnalyticsDashboard() {
  const { hasPermission } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('overview');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, selectedMetric]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/analytics?timeRange=${timeRange}&metric=${selectedMetric}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics/export?timeRange=${timeRange}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${timeRange}.csv`;
        a.click();
      }
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into platform performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={exportAnalytics}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {analytics?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{analytics.overview.totalUsers.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Total Users</p>
            <p className="text-xs text-green-600 mt-2">{analytics.overview.activeUsers} active</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{analytics.overview.totalCourses}</h3>
            <p className="text-sm text-gray-600">Total Courses</p>
            <p className="text-xs text-green-600 mt-2">{analytics.overview.totalCompletions} completions</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <Target className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{analytics.overview.averageScore}%</h3>
            <p className="text-sm text-gray-600">Average Score</p>
            <p className="text-xs text-blue-600 mt-2">Across all quizzes</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">{analytics.overview.totalCompletions}</h3>
            <p className="text-sm text-gray-600">Completions</p>
            <p className="text-xs text-orange-600 mt-2">This period</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Activity className="w-6 h-6 text-red-600" />
              </div>
              <BarChart3 className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800">${analytics.overview.totalRevenue.toLocaleString()}</h3>
            <p className="text-sm text-gray-600">Revenue</p>
            <p className="text-xs text-red-600 mt-2">Total earnings</p>
          </div>
        </div>
      )}

      {/* User Analytics */}
      {analytics?.userAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Growth</h3>
            <div className="space-y-3">
              {analytics.userAnalytics.daily.slice(0, 7).map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{new Date(day.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="font-medium">{day.users}</span>
                      <span className="text-gray-500 ml-1">users</span>
                    </div>
                    <div className="text-sm text-green-600">
                      +{day.signups}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Retention</h3>
            <div className="space-y-3">
              {analytics.userAnalytics.retention.map((period, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{period.period}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${period.rate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{period.rate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Course Analytics */}
      {analytics?.courseAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Popular Courses</h3>
            <div className="space-y-3">
              {analytics.courseAnalytics.popularCourses.slice(0, 5).map((course, index) => (
                <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-800">{course.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>{course.enrollments} enrollments</span>
                      <span>{course.completions} completions</span>
                      <span className="text-yellow-600">★ {course.rating}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-600">
                      {Math.round((course.completions / course.enrollments) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">completion</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Category Performance</h3>
            <div className="space-y-3">
              {analytics.courseAnalytics.categoryPerformance.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-800">{category.category}</h4>
                    <div className="text-sm text-gray-600">
                      {category.courses} courses • {category.enrollments} enrollments
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-600">
                      {category.completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">avg completion</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Performance */}
      {analytics?.systemPerformance && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium text-green-600">{analytics.systemPerformance.uptime}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${analytics.systemPerformance.uptime}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Avg Response Time</span>
                <span className="text-sm font-medium text-blue-600">{analytics.systemPerformance.responseTime}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((analytics.systemPerformance.responseTime / 1000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-medium text-red-600">{analytics.systemPerformance.errorRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${analytics.systemPerformance.errorRate}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Storage Usage</span>
                <span className="text-sm font-medium text-orange-600">
                  {Math.round((analytics.systemPerformance.storageUsage.used / analytics.systemPerformance.storageUsage.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${(analytics.systemPerformance.storageUsage.used / analytics.systemPerformance.storageUsage.total) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(analytics.systemPerformance.storageUsage.used / 1024 / 1024)}MB / {Math.round(analytics.systemPerformance.storageUsage.total / 1024 / 1024)}MB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
