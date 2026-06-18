/**
 * Reputation math for the StarkEd score impact simulator.
 *
 * Score formula (0–1000):
 *   base        = completedCourses * COURSE_WEIGHT
 *   credential  = verifiedCredentials * CREDENTIAL_WEIGHT
 *   streak      = studyStreak * STREAK_WEIGHT
 *   achievement = totalAchievements * ACHIEVEMENT_WEIGHT (rare ones double)
 *   rarity      = rareAchievements * RARE_BONUS
 *   total       = clamp(base + credential + streak + achievement + rarity, 0, MAX_SCORE)
 *
 * All arithmetic uses integer operations to avoid floating-point drift.
 */

export const SCORE_WEIGHTS = {
  COURSE: 50,
  CREDENTIAL: 80,
  STREAK: 5,
  ACHIEVEMENT: 15,
  RARE_BONUS: 20,
  MAX_SCORE: 1000,
} as const;

export interface ReputationInput {
  completedCourses: number;
  verifiedCredentials: number;
  studyStreak: number;
  totalAchievements: number;
  rareAchievements: number;
}

export interface ScoreBreakdown {
  base: number;
  credentialScore: number;
  streakScore: number;
  achievementScore: number;
  rareBonus: number;
  total: number;
}

/** Clamp a value to [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate a full score breakdown from reputation inputs.
 * Returns integer values only.
 */
export function calculateScoreBreakdown(input: ReputationInput): ScoreBreakdown {
  const base = Math.floor(input.completedCourses) * SCORE_WEIGHTS.COURSE;
  const credentialScore = Math.floor(input.verifiedCredentials) * SCORE_WEIGHTS.CREDENTIAL;
  const streakScore = Math.floor(input.studyStreak) * SCORE_WEIGHTS.STREAK;
  const achievementScore = Math.floor(input.totalAchievements) * SCORE_WEIGHTS.ACHIEVEMENT;
  const rareBonus = Math.floor(input.rareAchievements) * SCORE_WEIGHTS.RARE_BONUS;

  const rawTotal = base + credentialScore + streakScore + achievementScore + rareBonus;
  const total = clamp(rawTotal, 0, SCORE_WEIGHTS.MAX_SCORE);

  return { base, credentialScore, streakScore, achievementScore, rareBonus, total };
}

/** Calculate the total score only. */
export function calculateScore(input: ReputationInput): number {
  return calculateScoreBreakdown(input).total;
}

/**
 * Simulate the score delta for a proposed action.
 * Returns the difference in total score (can be negative).
 */
export interface SimulatedAction {
  completedCoursesDelta?: number;
  verifiedCredentialsDelta?: number;
  studyStreakDelta?: number;
  totalAchievementsDelta?: number;
  rareAchievementsDelta?: number;
}

export function simulateScoreImpact(
  current: ReputationInput,
  action: SimulatedAction,
): { currentScore: number; projectedScore: number; delta: number } {
  const projected: ReputationInput = {
    completedCourses: Math.max(0, current.completedCourses + (action.completedCoursesDelta ?? 0)),
    verifiedCredentials: Math.max(0, current.verifiedCredentials + (action.verifiedCredentialsDelta ?? 0)),
    studyStreak: Math.max(0, current.studyStreak + (action.studyStreakDelta ?? 0)),
    totalAchievements: Math.max(0, current.totalAchievements + (action.totalAchievementsDelta ?? 0)),
    rareAchievements: Math.max(0, current.rareAchievements + (action.rareAchievementsDelta ?? 0)),
  };

  const currentScore = calculateScore(current);
  const projectedScore = calculateScore(projected);

  return { currentScore, projectedScore, delta: projectedScore - currentScore };
}
