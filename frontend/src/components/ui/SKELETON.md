# Skeleton loading states

Reusable skeleton placeholders that mirror real page layouts so users see the
shape of incoming content (better perceived performance, no layout shift) instead
of a blank screen or a centred spinner.

## Primitives — `ui/Skeleton.tsx`

| Export             | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `Skeleton`         | Base pulsing block. Presentational (`aria-hidden`).  |
| `SkeletonText`     | Multi-line text placeholder (`lines` prop).          |
| `SkeletonAvatar`   | Circular avatar placeholder (`size` prop).           |
| `SkeletonCard`     | Media banner + title + body + actions.               |
| `SkeletonChart`    | Bar-chart placeholder (`bars` prop).                 |
| `SkeletonTableRow` | Single table row (`columns` prop).                   |

### Accessibility

- The base `Skeleton` block is `aria-hidden` so screen readers don't announce
  every shimmer.
- Each composite variant wraps its blocks in a region with `role="status"`,
  `aria-busy="true"` and an `aria-label` (overridable), plus an `sr-only` label.
- When a loading view contains many skeletons, wrap them in a single status
  region (see `CourseGridSkeleton`) so only one loading message is announced.

### Styling

Every component accepts `className`, merged via `cn()` (clsx + tailwind-merge),
so brand/spacing overrides win over the defaults. The pulse uses Tailwind's
`animate-pulse` for a subtle, consistent effect.

```tsx
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';

<Skeleton className="h-10 w-10 rounded-full" />
<SkeletonText lines={4} aria-label="Loading article" />
```

## Page / widget skeletons

- `dashboard/DashboardSkeleton.tsx` — metric cards + charts; rendered by
  `ProgressDashboard` while `isLoading`.
- `Discovery/CourseCardSkeleton.tsx` — `CourseCardSkeleton` and
  `CourseGridSkeleton`; rendered by `DiscoveryExperience` while results load.
- `Profile/ProfileSkeleton.tsx` — avatar + identity text + stats grid; rendered
  by the profile page while the profile loads.

## Pattern

```tsx
if (isLoading) return <DashboardSkeleton />;      // skeleton, not spinner
if (error)     return <ErrorState onRetry={...} />; // error replaces skeleton
return <RealContent data={data} />;
```
