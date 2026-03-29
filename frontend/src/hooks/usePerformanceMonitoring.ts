import { useEffect, useState, useCallback } from 'react';
import { performanceMonitor, PerformanceMetrics, PerformanceAlert } from '@/lib/performance-monitor';
import { performanceReporting, PerformanceReport } from '@/lib/performance-reporting';

export interface UsePerformanceMonitoringReturn {
  metrics: PerformanceMetrics[];
  alerts: PerformanceAlert[];
  currentReport: PerformanceReport | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  generateReport: () => void;
  clearData: () => void;
  averageMetrics: Partial<PerformanceMetrics>;
}

export const usePerformanceMonitoring = (): UsePerformanceMonitoringReturn => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);

  const updateData = useCallback(() => {
    setMetrics(performanceMonitor.getMetrics());
    setAlerts(performanceMonitor.getAlerts());
  }, []);

  const generateReport = useCallback(() => {
    const report = performanceReporting.generateReport();
    setCurrentReport(report);
    performanceReporting.saveReport(report);
    performanceReporting.sendReportToService(report);
  }, []);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const clearData = useCallback(() => {
    performanceMonitor.clearMetrics();
    updateData();
    setCurrentReport(null);
  }, [updateData]);

  useEffect(() => {
    if (isMonitoring) {
      updateData();
      
      const interval = setInterval(updateData, 5000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring, updateData]);

  useEffect(() => {
    // Generate initial report after component mounts
    const timer = setTimeout(() => {
      generateReport();
    }, 3000);

    return () => clearTimeout(timer);
  }, [generateReport]);

  const averageMetrics = performanceMonitor.getAverageMetrics();

  return {
    metrics,
    alerts,
    currentReport,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    generateReport,
    clearData,
    averageMetrics,
  };
};
