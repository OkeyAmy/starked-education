import { render, screen } from '@testing-library/react'
import {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonChart,
  SkeletonTableRow,
} from '../components/ui/Skeleton'
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton'
import { CourseGridSkeleton } from '../components/Discovery/CourseCardSkeleton'
import { ProfileSkeleton } from '../components/Profile/ProfileSkeleton'

describe('Skeleton', () => {
  describe('base Skeleton', () => {
    it('renders with the pulse animation', () => {
      const { container } = render(<Skeleton data-testid="sk" />)
      expect(container.firstChild).toHaveClass('animate-pulse')
    })

    it('merges a custom className', () => {
      const { container } = render(<Skeleton className="h-10 w-10" />)
      const el = container.firstChild as HTMLElement
      expect(el).toHaveClass('h-10')
      expect(el).toHaveClass('w-10')
      // base styling is preserved alongside the custom class
      expect(el).toHaveClass('animate-pulse')
    })

    it('is presentational (hidden from assistive tech)', () => {
      const { container } = render(<Skeleton />)
      expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('variants expose accessible loading regions', () => {
    it('SkeletonText renders the requested number of lines', () => {
      const { container } = render(<SkeletonText lines={5} />)
      const region = screen.getByRole('status')
      expect(region).toHaveAttribute('aria-busy', 'true')
      // 5 line blocks (sr-only span is not animated)
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(5)
    })

    it('SkeletonAvatar has an aria-busy status with default label', () => {
      render(<SkeletonAvatar />)
      const region = screen.getByRole('status')
      expect(region).toHaveAttribute('aria-busy', 'true')
      expect(region).toHaveAttribute('aria-label', 'Loading avatar')
    })

    it('SkeletonCard renders a status region', () => {
      render(<SkeletonCard />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('SkeletonChart renders the requested number of bars', () => {
      const { container } = render(<SkeletonChart bars={6} />)
      // title + 6 bars + 3 axis labels = 10 pulse blocks
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(10)
    })

    it('SkeletonTableRow renders the requested number of columns', () => {
      const { container } = render(<SkeletonTableRow columns={3} />)
      expect(container.querySelectorAll('.animate-pulse')).toHaveLength(3)
    })

    it('accepts a custom aria-label', () => {
      render(<SkeletonText aria-label="Loading my notes" />)
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Loading my notes',
      )
    })
  })

  describe('composite page skeletons', () => {
    it('DashboardSkeleton renders metric cards and charts', () => {
      render(<DashboardSkeleton />)
      const region = screen.getByRole('status', { name: 'Loading dashboard' })
      expect(region).toHaveAttribute('aria-busy', 'true')
      // two charts each expose their own status region
      expect(screen.getByRole('status', { name: 'Loading activity chart' })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: 'Loading progress chart' })).toBeInTheDocument()
    })

    it('CourseGridSkeleton renders the requested number of cards', () => {
      const { container } = render(<CourseGridSkeleton count={4} />)
      expect(screen.getByRole('status', { name: 'Loading courses' })).toBeInTheDocument()
      expect(container.querySelectorAll('article')).toHaveLength(4)
    })

    it('ProfileSkeleton exposes a loading region with avatar and stats', () => {
      const { container } = render(<ProfileSkeleton />)
      expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: 'Loading avatar' })).toBeInTheDocument()
      expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    })
  })
})
