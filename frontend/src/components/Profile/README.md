# Profile Management Dashboard

A comprehensive profile management system for the StarkEd Education platform.

## Features

### 📝 Profile Management
- Editable personal information (name, email, bio, location, website)
- Avatar upload and management
- Privacy settings (public, private, friends-only)
- Real-time form validation

### 🏆 Achievement System
- Multiple rarity levels (common, rare, epic, legendary)
- Progress tracking for incomplete achievements
- Category-based filtering and search
- Animated achievement unlocks
- Detailed achievement requirements

### 🎓 Credential Management
- Multiple credential types (certificates, badges, degrees, licenses)
- Verification status tracking (verified, pending, rejected, expired)
- Skills tagging and organization
- External verification links
- Download functionality

### 📊 Statistics & Analytics
- Course completion metrics
- Study streak tracking
- Global ranking and percentile
- Performance scoring
- Visual progress indicators
- Detailed analytics dashboard

## Components

### Core Components

#### `ProfileEditor`
- Modal-based profile editing interface
- Form validation with react-hook-form
- Avatar upload functionality
- Privacy settings management

#### `AchievementDisplay`
- Grid layout for achievements
- Filtering by category and rarity
- Search functionality
- Progress visualization
- Compact and full view modes

#### `CredentialList`
- List view for credentials
- Status indicators
- Verification links
- Skills display
- Add new credentials functionality

#### `ProfileStats`
- Statistics dashboard
- Progress bars and charts
- Ranking information
- Performance metrics
- Responsive grid layout

### Data Management

#### `useProfile` Hook
- Centralized state management
- localStorage integration
- Mock data for development
- CRUD operations for all profile data
- Error handling and loading states

#### Type Definitions
- Comprehensive TypeScript interfaces
- Type safety throughout the application
- Extensible data structures

## Usage

### Basic Setup

```tsx
import { useProfile } from '../hooks/useProfile';
import { ProfileEditor } from '../components/ProfileEditor';

function ProfilePage() {
  const { profile, updateProfile, loading } = useProfile();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <ProfileEditor
        onSuccess={() => console.log('Profile updated')}
        onClose={() => console.log('Editor closed')}
      />
    </div>
  );
}
```

### Achievement Display

```tsx
import { AchievementDisplay } from '../components/AchievementDisplay';

<AchievementDisplay
  achievements={achievements}
  showProgress={true}
  filterable={true}
  searchable={true}
/>
```

### Credential Management

```tsx
import { CredentialList } from '../components/CredentialList';

<CredentialList
  credentials={credentials}
  showAddButton={true}
  filterable={true}
  searchable={true}
/>
```

## Data Structure

### Profile
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  joinDate: string;
  totalCoursesCompleted: number;
  currentStreak: number;
  studyHours: number;
  level: number;
  experience: number;
  privacy: 'public' | 'private' | 'friends-only';
}
```

### Achievement
```typescript
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: string;
  category: string;
  progress?: number;
  maxProgress?: number;
}
```

### Credential
```typescript
interface Credential {
  id: string;
  title: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  credentialId: string;
  type: 'certificate' | 'badge' | 'degree' | 'license';
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'expired';
  verificationUrl?: string;
  documentUrl?: string;
  skills: string[];
}
```

## Styling

The components use Tailwind CSS with:
- Responsive design patterns
- Dark mode support
- Consistent color scheme
- Smooth transitions and animations
- Hover states and micro-interactions

## State Management

- Local storage for data persistence
- React hooks for state management
- Optimistic updates for better UX
- Error handling and loading states
- Data validation and sanitization

## Testing

Test data and utilities are provided in `test-profile.tsx`:
```tsx
import { testProfileData } from '../test-profile';

const testData = testProfileData();
console.log('Profile system test:', testData.isValid);
```

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast support

## Performance

- Lazy loading for large datasets
- Memoized components
- Efficient filtering and searching
- Optimized re-renders
- Minimal bundle impact

## Future Enhancements

- Real-time updates with WebSocket
- Social features (following, sharing)
- Advanced analytics and insights
- Export functionality
- Integration with learning management systems
- Gamification elements

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 18+
- Next.js 14+
- TypeScript 5+
- Tailwind CSS 3+
- React Hook Form 7+
- Lucide React (icons)

## Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Include tests for new functionality
4. Update documentation as needed
5. Ensure responsive design compliance
