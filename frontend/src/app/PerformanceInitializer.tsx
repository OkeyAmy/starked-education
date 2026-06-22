'use client';

import { useEffect } from 'react';

export default function PerformanceInitializer() {
  useEffect(() => {
    // Dynamically import the performance monitor to keep web-vitals out of initial chunks
    import('@/lib/performance-monitor').then((mod) => {
      // Reference it to trigger initialization side effects
      mod.performanceMonitor;
    });
  }, []);

  return null;
}
