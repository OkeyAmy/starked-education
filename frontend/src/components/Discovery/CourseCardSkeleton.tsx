import React from 'react';
import { Skeleton } from '../ui/Skeleton';
import { ViewMode } from './types';

/**
 * Loading placeholder that mirrors {@link CourseCard}'s layout so the discovery
 * grid keeps its shape while results load (no layout shift).
 */
export const CourseCardSkeleton: React.FC<{ view?: ViewMode }> = ({
  view = 'grid',
}) => {
  return (
    <article
      aria-hidden="true"
      className="rounded-[24px] border border-slate-200 bg-white p-4"
    >
      <div className={`${view === 'list' ? 'flex-row' : 'flex-col'} flex gap-4`}>
        <Skeleton
          className={`${view === 'list' ? 'h-28 w-40' : 'h-40 w-full'} rounded-[20px]`}
        />
        <div className="flex flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-3/4" />
            </div>
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-14" />
          </div>

          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </article>
  );
};

/**
 * Grid of {@link CourseCardSkeleton} wrapped in a single status region so screen
 * readers announce one "loading courses" message for the whole grid.
 */
export const CourseGridSkeleton: React.FC<{
  count?: number;
  view?: ViewMode;
}> = ({ count = 6, view = 'grid' }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label="Loading courses"
    className="contents"
  >
    {Array.from({ length: count }).map((_, index) => (
      <CourseCardSkeleton key={index} view={view} />
    ))}
    <span className="sr-only">Loading courses</span>
  </div>
);

export default CourseCardSkeleton;
