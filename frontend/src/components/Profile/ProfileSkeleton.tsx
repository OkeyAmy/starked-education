'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton, SkeletonAvatar } from '@/components/ui/Skeleton';

/** Stat tile placeholder matching ProfileStats' compact cards. */
function StatTileSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

/**
 * Profile page loading state: avatar + identity text in the header, followed by
 * a stats grid. Mirrors the real profile layout to avoid layout shift.
 */
export function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading profile"
      className={cn('min-h-screen bg-gray-50 dark:bg-slate-900', className)}
    >
      {/* Header: avatar + name/text */}
      <div className="border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <SkeletonAvatar size={80} />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatTileSkeleton key={index} />
          ))}
        </div>
      </div>

      <span className="sr-only">Loading profile</span>
    </div>
  );
}

export default ProfileSkeleton;
