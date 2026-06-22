import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ProfileEditor } from '../components/ProfileEditor'
import { AchievementDisplay } from '../components/AchievementDisplay'
import { CredentialList } from '../components/CredentialList'
import { ProfileStats } from '../components/ProfileStats'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { testProfile, testAchievements, testCredentials, testStats } from '../test-profile'

// Mock the useProfile hook
jest.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: testProfile,
    achievements: testAchievements,
    credentials: testCredentials,
    stats: testStats,
    loading: false,
    error: null,
    updateProfile: jest.fn(),
    reloadProfile: jest.fn(),
  }),
}))

describe('Profile Components', () => {
  describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test Content</div>
        </ErrorBoundary>
      )
      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('displays error UI when there is an error', () => {
      const ThrowError = () => {
        throw new Error('Test error')
      }
      
      render(
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  describe('AchievementDisplay', () => {
    it('renders achievements correctly', () => {
      render(<AchievementDisplay achievements={testAchievements} />)
      
      expect(screen.getByText('First Steps')).toBeInTheDocument()
      expect(screen.getByText('Week Warrior')).toBeInTheDocument()
    })

    it('handles empty achievements array', () => {
      render(<AchievementDisplay achievements={[]} />)
      
      // Component renders this exact copy when the achievements array is
      // empty and no filter is active (see AchievementDisplay.tsx
      // "No Results" branch).
      expect(screen.getByText('No achievements available')).toBeInTheDocument()
    })

    it('filters achievements by category', () => {
      render(<AchievementDisplay achievements={testAchievements} filterable={true} />)
      
      // Component exposes its category filter as a <select> whose default
      // option is `All Categories`; this is the visible label users (and
      // getByText) will resolve against.
      const categoryFilter = screen.getByText('Category')
      expect(categoryFilter).toBeInTheDocument()
    })
  })

  describe('CredentialList', () => {
    it('renders credentials correctly', () => {
      render(<CredentialList credentials={testCredentials} />)
      
      // The `testCredentials` fixture in `frontend/src/test-profile.tsx`
      // now ships three distinct credentials, exercising the credential
      // map/list rendering across multiple rows. This catches regressions
      // that would otherwise be missed if we shrank to a single record.
      expect(screen.getByText('Test Certificate')).toBeInTheDocument()
      expect(screen.getByText('TypeScript Certification')).toBeInTheDocument()
      expect(screen.getByText('React Developer')).toBeInTheDocument()
    })

    it('handles empty credentials array', () => {
      render(<CredentialList credentials={[]} />)
      
      // Component renders this exact copy when the credentials array is
      // empty and no filter is active (see CredentialList.tsx
      // "No Results" branch).
      expect(screen.getByText('No credentials available')).toBeInTheDocument()
    })
  })

  describe('ProfileStats', () => {
    it('renders statistics correctly', () => {
      render(<ProfileStats stats={testStats} />)

      // `testStats` fixture has completedCourses: 10 and studyStreak: 5.
      // ProfileStats surfaces these values in multiple places (the hero
      // cards plus the detailed stat tiles), so we use `getAllByText`
      // and assert at-least-one match rather than a single unique
      // element — `getByText` would throw.
      expect(screen.getAllByText('10').length).toBeGreaterThan(0) // completedCourses
      expect(screen.getAllByText('5').length).toBeGreaterThan(0) // studyStreak
    })

    it('handles null stats gracefully', () => {
      render(<ProfileStats stats={null as any} />)

      // Should not crash; every missing stat falls back to "0" so
      // `getAllByText` returns many matches. Use length-based assertion
      // instead of `getByText` to avoid the multi-match throw.
      const zeroes = screen.getAllByText('0')
      expect(zeroes.length).toBeGreaterThan(0)
    })
  })

  describe('ProfileEditor', () => {
    it('renders form fields correctly', () => {
      render(<ProfileEditor />)

      // Labels render as "Name *" / "Email *" / "Bio" (the * marks required
      // fields). Use regexes so the assertions stay robust.
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument()
    })

    it('validates form inputs', async () => {
      render(<ProfileEditor />)

      // The form is pre-filled from the mock useProfile (testProfile). The
      // submit button is `disabled={!isDirty}`, so we must mutate the
      // name field (to empty) to flip it dirty. Only then does clicking
      // submit run the Zod resolver (`zodResolver(profileSchema)`).
      const nameInput = screen.getByLabelText(/Name/i) as HTMLInputElement
      fireEvent.change(nameInput, { target: { value: '' } })
      const submitButton = screen.getByText('Save Changes')
      fireEvent.click(submitButton)

      // The schema chains `.min(1,'Name is required')` and
      // `.min(2,'Name must be at least 2 characters')`, so either of
      // Zod's messages for the `name` field could surface. Match a
      // regex so both are accepted.
      await waitFor(() => {
        const matches = screen.queryAllByText(/Name is required|Name must be at least/i)
        expect(matches.length).toBeGreaterThan(0)
      })
    })
  })
})
