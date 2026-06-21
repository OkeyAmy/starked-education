'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton, SkeletonRegion, SkeletonChart } from '@/components/ui/Skeleton';

export interface AnalyticsSkeletonProps {
  className?: string;
}

export function ProgressDashboardSkeleton({ className }: AnalyticsSkeletonProps) {
  return (
    <SkeletonRegion
      aria-label="Loading analytics dashboard"
      className={cn('space-y-6 p-6', className)}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Skeleton className="h-3 w-32" />
            <div className="mt-2 flex items-center justify-between">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-2/5 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-1 lg:col-span-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-64 w-full rounded-lg" />
        </div>
        <div className="col-span-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="mt-3 h-64 w-full rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <Skeleton className="h-5 w-24" />
            <div className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2 w-1/3 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function CompletionStatsSkeleton({ className }: AnalyticsSkeletonProps) {
  return (
    <SkeletonRegion
      aria-label="Loading completion stats"
      className={cn('space-y-6', className)}
    >
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Skeleton className="h-5 w-32" />
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto h-8 w-8 rounded" />
              <Skeleton className="mx-auto mt-2 h-7 w-12" />
              <Skeleton className="mx-auto mt-1 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-4 dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <div className="mt-2 flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-16 rounded" />
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-100 p-4 dark:border-slate-700">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SkeletonRegion>
  );
}

export function ProgressChartSkeleton({ className }: AnalyticsSkeletonProps) {
  return (
    <SkeletonRegion
      aria-label="Loading progress chart"
      className={cn('rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-16 rounded" />
          ))}
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-4 w-36" />
            <SkeletonChart bars={6} className="mt-2 border-0 p-0 shadow-none" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6 md:grid-cols-4 dark:border-slate-700">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="mx-auto h-7 w-12" />
            <Skeleton className="mx-auto mt-1 h-3 w-16" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  );
}

export function TimeAnalysisSkeleton({ className }: AnalyticsSkeletonProps) {
  return (
    <SkeletonRegion
      aria-label="Loading time analysis"
      className={cn('rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800', className)}
    >
      <Skeleton className="h-5 w-28" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1 h-6 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-64 w-full rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-4 h-64 w-full rounded-lg" />
        </div>
      </div>
    </SkeletonRegion>
  );
}

export default ProgressDashboardSkeleton;
