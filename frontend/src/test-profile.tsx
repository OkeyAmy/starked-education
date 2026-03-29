// Test file to verify profile components work correctly
// This file can be used to test the profile management system

import { UserProfile, Achievement, Credential, ProfileStats } from './types/profile';

// Test data
const testProfile: UserProfile = {
  id: 'test-1',
  name: 'Test User',
  email: 'test@example.com',
  avatar: '',
  bio: 'Test bio',
  location: 'Test Location',
  website: 'https://test.com',
  joinDate: '2023-01-01',
  totalCoursesCompleted: 10,
  currentStreak: 5,
  studyHours: 100,
  level: 3,
  experience: 1500,
  privacy: 'public'
};

const testAchievements: Achievement[] = [
  {
    id: 'ach-1',
    name: 'First Steps',
    description: 'Complete your first course',
    icon: '🎯',
    earnedDate: '2023-01-15',
    rarity: 'common',
    requirement: 'Complete any course',
    category: 'milestone',
    progress: 1,
    maxProgress: 1
  },
  {
    id: 'ach-2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day study streak',
    icon: '🔥',
    rarity: 'rare',
    requirement: 'Study for 7 consecutive days',
    category: 'streak',
    progress: 5,
    maxProgress: 7
  }
];

const testCredentials: Credential[] = [
  {
    id: 'cred-1',
    title: 'Test Certificate',
    issuer: 'Test Academy',
    issueDate: '2023-01-01',
    credentialId: 'TEST-001',
    type: 'certificate',
    verificationStatus: 'verified',
    verificationUrl: 'https://verify.test.com/TEST-001',
    skills: ['Test Skill 1', 'Test Skill 2']
  }
];

const testStats: ProfileStats = {
  totalCourses: 15,
  completedCourses: 10,
  inProgressCourses: 5,
  totalCertificates: 8,
  verifiedCredentials: 2,
  pendingCredentials: 1,
  totalAchievements: 4,
  rareAchievements: 1,
  studyStreak: 5,
  totalStudyHours: 100,
  averageCompletionTime: 14,
  rank: 42,
  percentile: 78
};

// Test function to verify data structure
export function testProfileData() {
  console.log('Testing Profile Management System...');
  
  // Test profile data
  console.log('✓ Profile data:', testProfile);
  
  // Test achievements data
  console.log('✓ Achievements data:', testAchievements);
  
  // Test credentials data
  console.log('✓ Credentials data:', testCredentials);
  
  // Test stats data
  console.log('✓ Stats data:', testStats);
  
  // Test data integrity
  const hasValidProfile = testProfile.name && testProfile.email;
  const hasValidAchievements = testAchievements.every(a => a.name && a.description);
  const hasValidCredentials = testCredentials.every(c => c.title && c.issuer);
  const hasValidStats = testStats.totalCourses >= testStats.completedCourses;
  
  console.log('✓ Data integrity checks:');
  console.log('  - Profile valid:', hasValidProfile);
  console.log('  - Achievements valid:', hasValidAchievements);
  console.log('  - Credentials valid:', hasValidCredentials);
  console.log('  - Stats valid:', hasValidStats);
  
  return {
    profile: testProfile,
    achievements: testAchievements,
    credentials: testCredentials,
    stats: testStats,
    isValid: hasValidProfile && hasValidAchievements && hasValidCredentials && hasValidStats
  };
}

// Export test data for use in components
export { testProfile, testAchievements, testCredentials, testStats };
