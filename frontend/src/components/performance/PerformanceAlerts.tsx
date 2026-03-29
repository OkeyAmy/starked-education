'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { PerformanceAlert } from '@/lib/performance-monitor';

interface PerformanceAlertsProps {
  alerts: PerformanceAlert[];
  onClearAlerts?: () => void;
}

const PerformanceAlerts: React.FC<PerformanceAlertsProps> = ({ alerts, onClearAlerts }) => {
  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getMetricName = (metric: string) => {
    const names: Record<string, string> = {
      cls: 'Cumulative Layout Shift',
      fid: 'First Input Delay',
      fcp: 'First Contentful Paint',
      lcp: 'Largest Contentful Paint',
      ttfb: 'Time to First Byte',
    };
    return names[metric] || metric.toUpperCase();
  };

  const formatValue = (metric: string, value: number) => {
    if (metric === 'cls') {
      return value.toFixed(3);
    }
    return `${Math.round(value)}ms`;
  };

  const getAlertDescription = (alert: PerformanceAlert) => {
    const metricName = getMetricName(alert.metric);
    const formattedValue = formatValue(alert.metric, alert.value);
    
    switch (alert.metric) {
      case 'cls':
        return `${metricName} is ${formattedValue}, which may cause visual instability`;
      case 'fid':
        return `${metricName} is ${formattedValue}, making the site feel sluggish`;
      case 'fcp':
        return `${metricName} is ${formattedValue}, causing slow initial rendering`;
      case 'lcp':
        return `${metricName} is ${formattedValue}, affecting perceived load speed`;
      case 'ttfb':
        return `${metricName} is ${formattedValue}, indicating slow server response`;
      default:
        return `${metricName} exceeds recommended threshold`;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Performance Alerts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No performance alerts detected</p>
            <p className="text-sm">Your application is performing well!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5" />
          <span>Performance Alerts</span>
          <Badge variant="destructive">{alerts.length}</Badge>
        </CardTitle>
        {onClearAlerts && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAlerts}
            className="flex items-center space-x-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear</span>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">{getMetricName(alert.metric)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getAlertDescription(alert)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <Badge className={getSeverityColor(alert.severity)}>
                    {alert.severity}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatValue(alert.metric, alert.value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Threshold: {formatValue(alert.metric, alert.threshold)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
                {alert.url && (
                  <div className="flex items-center space-x-1">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate max-w-xs">
                      {new URL(alert.url).pathname}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Quick Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <Button variant="outline" size="sm" className="justify-start">
              Run Performance Audit
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              View Bundle Analysis
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              Optimization Recommendations
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              Export Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceAlerts;
