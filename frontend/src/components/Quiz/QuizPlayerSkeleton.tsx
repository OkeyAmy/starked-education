'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';

export interface QuizPlayerSkeletonProps {
  className?: string;
}

export function QuizPlayerSkeleton({ className }: QuizPlayerSkeletonProps) {
  return (
    <SkeletonRegion
      aria-label="Loading quiz"
      className={cn('max-w-4xl mx-auto w-full px-4 py-8', className)}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <div className="hidden h-10 w-px bg-slate-200 md:block dark:bg-slate-700" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-32 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/50">
          <Skeleton className="h-4 w-24" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-10 w-24 rounded-xl" />
        <Skeleton className="h-12 w-48 rounded-2xl" />
      </div>
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 w-2.5 rounded-full" />
        ))}
      </div>
    </SkeletonRegion>
  );
}

export default QuizPlayerSkeleton;
