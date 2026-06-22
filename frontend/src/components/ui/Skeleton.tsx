'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Ensures the skeleton is visible for at least `minDuration` ms to avoid a
 * flash of loading content on fast connections.
 */
export function useSkeletonVisibility(
  isLoading: boolean,
  minDuration = 300,
): boolean {
  const [show, setShow] = React.useState(isLoading);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = React.useRef<number>(0);

  React.useEffect(() => {
    if (isLoading) {
      startRef.current = Date.now();
      setShow(true);
    } else {
      const elapsed = Date.now() - startRef.current;
      const remaining = minDuration - elapsed;
      if (remaining > 0) {
        timerRef.current = setTimeout(() => setShow(false), remaining);
      } else {
        setShow(false);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isLoading, minDuration]);

  return show;
}

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
export type SkeletonRegionProps = React.HTMLAttributes<HTMLDivElement> & {
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

/** Button placeholder. */
function SkeletonButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn('h-9 w-24 rounded-lg', className)}
      {...props}
    />
  );
}

/** Input/field placeholder. */
function SkeletonInput({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn('h-10 w-full rounded-lg', className)}
      {...props}
    />
  );
}

/** Badge/tag placeholder. */
function SkeletonBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Skeleton
      className={cn('h-5 w-14 rounded-full', className)}
      {...props}
    />
  );
}

/** Stat tile: icon, label, value. */
export interface SkeletonStatTileProps extends SkeletonRegionProps {
  rows?: number;
}

function SkeletonStatTile({
  className,
  'aria-label': ariaLabel = 'Loading stat',
  ...props
}: SkeletonStatTileProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900',
        className,
      )}
      {...props}
    >
      <div className="mb-2 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-7 w-20" />
    </SkeletonRegion>
  );
}

/** A loading placeholder for the quiz player layout. */
function SkeletonQuizPlayer({
  className,
  'aria-label': ariaLabel = 'Loading quiz',
  ...props
}: SkeletonRegionProps) {
  return (
    <SkeletonRegion
      aria-label={ariaLabel}
      className={cn('max-w-4xl mx-auto w-full px-4 py-8', className)}
      {...props}
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
            <Skeleton className="h-8 w-32 rounded-lg" />
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
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
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

/** A room card skeleton matching RoomLobby card layout. */
function SkeletonRoomCard({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded-lg bg-slate-800 p-6',
        className,
      )}
      {...props}
    >
      <div className="mb-4 flex items-start justify-between">
        <Skeleton className="h-6 w-40 rounded bg-slate-700" />
        <Skeleton className="h-5 w-12 rounded-full bg-slate-700" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded bg-slate-700" />
          <Skeleton className="h-3 w-32 bg-slate-700" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded bg-slate-700" />
          <Skeleton className="h-3 w-40 bg-slate-700" />
        </div>
      </div>
      <Skeleton className="mt-4 h-10 w-full rounded-lg bg-slate-700" />
    </div>
  );
}

/**
 * Error state distinct from loading. Renders a red-tinted card with an error
 * icon, message, and retry button. Use in place of skeletons when data
 * fetching fails.
 */
export interface SkeletonErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

function SkeletonError({
  message = 'Something went wrong',
  onRetry,
  className,
}: SkeletonErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20',
        className,
      )}
    >
      <p className="text-sm font-medium text-red-800 dark:text-red-300">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export {
  Skeleton,
  SkeletonRegion,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonChart,
  SkeletonTableRow,
  SkeletonButton,
  SkeletonInput,
  SkeletonBadge,
  SkeletonStatTile,
  SkeletonQuizPlayer,
  SkeletonRoomCard,
  SkeletonError,
};

export default Skeleton;
