'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton, SkeletonChart } from '@/components/ui/Skeleton';

/** Metric/stat card placeholder used in the dashboard overview grid. */
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm dark:border-slate-700',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-16" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-2 w-full rounded-full" />
    </div>
  );
}

/**
 * Full dashboard loading state: a grid of metric cards followed by a chart,
 * mirroring the real ProgressDashboard layout to avoid layout shift.
 */
export function DashboardSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading dashboard"
      className={cn('space-y-6', className)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MetricCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonChart aria-label="Loading activity chart" />
        <SkeletonChart aria-label="Loading progress chart" />
      </div>

      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}

export default DashboardSkeleton;
