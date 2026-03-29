export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export enum PrivacyLevel {
  Public = 'Public',
  Private = 'Private',
  FriendsOnly = 'FriendsOnly',
}

export interface UserProfile {
  owner: string; // Stellar Address
  username: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: number;
  updatedAt: number;
  achievements: number[]; // Achievement IDs
  credentials: number[]; // Credential IDs
  reputation: number;
  privacyLevel: PrivacyLevel;
  role: UserRole;
}

export interface Achievement {
  id: number;
  user: string;
  title: string;
  description: string;
  earnedAt: number;
  badgeUrl?: string;
  verified: boolean;
}

export interface UserStats {
  totalCourses: number;
  totalCredentials: number;
  totalAchievements: number;
  reputation: number;
}