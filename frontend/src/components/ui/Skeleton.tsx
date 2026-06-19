'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base skeleton block.
 *
 * Renders a single muted, pulsing placeholder. It is presentational by default
 * (`aria-hidden`) so that screen readers announce the loading state once, on the
 * surrounding region, rather than once per shimmer. Pass `role`/`aria-*` props to
 * override when a bare `Skeleton` is used standalone.
 */
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-md bg-slate-200 dark:bg-slate-700',
        className,
      )}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';

/**
 * Props shared by the composite skeleton variants. Each variant wraps its
 * decorative blocks in a region that exposes `role="status"`, `aria-busy` and an
 * `aria-label`, so assistive technology reports a single, meaningful loading
 * message. `aria-label` can be overridden per usage.
 */
type SkeletonRegionProps = React.HTMLAttributes<HTMLDivElement> & {
  'aria-label'?: string;
};

function SkeletonRegion({
  className,
  children,
  'aria-label': ariaLabel = 'Loading',
  ...props
}: SkeletonRegionProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={className}
      {...props}
    >
      {children}
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

/** Multi-line text placeholder. The final line is shortened to feel natural. */
export interface SkeletonTextProps extends SkeletonRegionProps {
  lines?: number;
}

function SkeletonText({
  lines = 3,
  className,
  'aria-label': ariaLabel = 'Loading content',
  ...props
}: SkeletonTextProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn('space-y-2', className)}
      {...props}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4 w-full', index === lines - 1 && 'w-2/3')}
        />
      ))}
    </SkeletonRegion>
  );
}

/** Circular avatar placeholder. */
export interface SkeletonAvatarProps extends SkeletonRegionProps {
  size?: number;
}

function SkeletonAvatar({
  size = 48,
  className,
  'aria-label': ariaLabel = 'Loading avatar',
  ...props
}: SkeletonAvatarProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn('inline-block', className)}
      {...props}
    >
      <Skeleton
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    </SkeletonRegion>
  );
}

/** Card placeholder: media banner, title, body lines and a footer action. */
function SkeletonCard({
  className,
  'aria-label': ariaLabel = 'Loading card',
  ...props
}: SkeletonRegionProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="mt-4 h-5 w-3/4" />
      <div className="mt-3 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
    </SkeletonRegion>
  );
}

/** Chart placeholder: a row of bars of varying heights with axis labels. */
export interface SkeletonChartProps extends SkeletonRegionProps {
  bars?: number;
}

function SkeletonChart({
  bars = 8,
  className,
  'aria-label': ariaLabel = 'Loading chart',
  ...props
}: SkeletonChartProps) {
  // Deterministic heights keep render output stable (no layout shift on re-render).
  const heights = ['45%', '70%', '55%', '85%', '40%', '75%', '60%', '90%'];

  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      <Skeleton className="h-5 w-40" />
      <div className="mt-6 flex h-48 items-end gap-3">
        {Array.from({ length: bars }).map((_, index) => (
          <Skeleton
            key={index}
            className="flex-1 rounded-t-md"
            style={{ height: heights[index % heights.length] }}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </SkeletonRegion>
  );
}

/** A single table row placeholder with configurable columns. */
export interface SkeletonTableRowProps extends SkeletonRegionProps {
  columns?: number;
}

function SkeletonTableRow({
  columns = 4,
  className,
  'aria-label': ariaLabel = 'Loading row',
  ...props
}: SkeletonTableRowProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-4 border-b border-slate-100 py-3 dark:border-slate-800',
        className,
      )}
      {...props}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-4 flex-1', index === 0 && 'max-w-[40%]')}
        />
      ))}
    </SkeletonRegion>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonChart,
  SkeletonTableRow,
};

export default Skeleton;
