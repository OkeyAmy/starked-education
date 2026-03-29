'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { PerformanceMetrics } from '@/lib/performance-monitor';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  threshold: { good: number; needsImprovement: number; poor: number };
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, threshold, icon }) => {
  const getStatus = () => {
    if (value <= threshold.good) return 'good';
    if (value <= threshold.needsImprovement) return 'needs-improvement';
    return 'poor';
  };

  const status = getStatus();
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800 border-green-200';
      case 'needs-improvement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'needs-improvement': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'poor': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-2">
          {icon}
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value.toFixed(unit === 'ms' ? 0 : 3)}
          <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
        </div>
        <Badge className={`mt-2 ${getStatusColor()}`} variant="outline">
          {status.replace('-', ' ')}
        </Badge>
      </CardContent>
    </Card>
  );
};

interface PerformanceMetricsOverviewProps {
  metrics: Partial<PerformanceMetrics>;
}

export const PerformanceMetricsOverview: React.FC<PerformanceMetricsOverviewProps> = ({ metrics }) => {
  const coreWebVitals = [
    {
      title: 'Largest Contentful Paint',
      value: metrics.lcp || 0,
      unit: 'ms',
      threshold: { good: 2500, needsImprovement: 4000, poor: 6000 },
      icon: <Activity className="w-4 h-4 text-blue-600" />,
    },
    {
      title: 'First Input Delay',
      value: metrics.fid || 0,
      unit: 'ms',
      threshold: { good: 100, needsImprovement: 300, poor: 600 },
      icon: <Activity className="w-4 h-4 text-green-600" />,
    },
    {
      title: 'Cumulative Layout Shift',
      value: metrics.cls || 0,
      unit: '',
      threshold: { good: 0.1, needsImprovement: 0.25, poor: 0.5 },
      icon: <Activity className="w-4 h-4 text-purple-600" />,
    },
    {
      title: 'First Contentful Paint',
      value: metrics.fcp || 0,
      unit: 'ms',
      threshold: { good: 1800, needsImprovement: 3000, poor: 4000 },
      icon: <Activity className="w-4 h-4 text-orange-600" />,
    },
    {
      title: 'Time to First Byte',
      value: metrics.ttfb || 0,
      unit: 'ms',
      threshold: { good: 800, needsImprovement: 1800, poor: 3000 },
      icon: <Activity className="w-4 h-4 text-red-600" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {coreWebVitals.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};
