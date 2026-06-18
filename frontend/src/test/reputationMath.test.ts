import {
  calculateScore,
  calculateScoreBreakdown,
  simulateScoreImpact,
  SCORE_WEIGHTS,
  type ReputationInput,
} from '../lib/reputationMath';

const baseInput: ReputationInput = {
  completedCourses: 0,
  verifiedCredentials: 0,
  studyStreak: 0,
  totalAchievements: 0,
  rareAchievements: 0,
};

describe('reputationMath', () => {
  describe('calculateScoreBreakdown', () => {
    it('returns all zeros for empty input', () => {
      const result = calculateScoreBreakdown(baseInput);
      expect(result).toEqual({ base: 0, credentialScore: 0, streakScore: 0, achievementScore: 0, rareBonus: 0, total: 0 });
    });

    it('calculates course weight correctly', () => {
      const result = calculateScoreBreakdown({ ...baseInput, completedCourses: 3 });
      expect(result.base).toBe(3 * SCORE_WEIGHTS.COURSE);
    });

    it('calculates credential weight correctly', () => {
      const result = calculateScoreBreakdown({ ...baseInput, verifiedCredentials: 2 });
      expect(result.credentialScore).toBe(2 * SCORE_WEIGHTS.CREDENTIAL);
    });

    it('calculates streak weight correctly', () => {
      const result = calculateScoreBreakdown({ ...baseInput, studyStreak: 10 });
      expect(result.streakScore).toBe(10 * SCORE_WEIGHTS.STREAK);
    });

    it('calculates achievement weight correctly', () => {
      const result = calculateScoreBreakdown({ ...baseInput, totalAchievements: 4 });
      expect(result.achievementScore).toBe(4 * SCORE_WEIGHTS.ACHIEVEMENT);
    });

    it('calculates rare bonus correctly', () => {
      const result = calculateScoreBreakdown({ ...baseInput, rareAchievements: 2 });
      expect(result.rareBonus).toBe(2 * SCORE_WEIGHTS.RARE_BONUS);
    });

    it('clamps total score to MAX_SCORE', () => {
      const highInput: ReputationInput = {
        completedCourses: 100,
        verifiedCredentials: 100,
        studyStreak: 100,
        totalAchievements: 100,
        rareAchievements: 100,
      };
      const result = calculateScoreBreakdown(highInput);
      expect(result.total).toBe(SCORE_WEIGHTS.MAX_SCORE);
    });

    it('does not return negative total', () => {
      const result = calculateScoreBreakdown(baseInput);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('uses integer arithmetic (no floating-point values)', () => {
      const input: ReputationInput = { ...baseInput, completedCourses: 1, studyStreak: 3 };
      const result = calculateScoreBreakdown(input);
      expect(Number.isInteger(result.total)).toBe(true);
    });
  });

  describe('calculateScore', () => {
    it('returns the same total as calculateScoreBreakdown', () => {
      const input: ReputationInput = { ...baseInput, completedCourses: 2, verifiedCredentials: 1 };
      expect(calculateScore(input)).toBe(calculateScoreBreakdown(input).total);
    });
  });

  describe('simulateScoreImpact', () => {
    it('returns zero delta when no action deltas are provided', () => {
      const result = simulateScoreImpact(baseInput, {});
      expect(result.delta).toBe(0);
      expect(result.currentScore).toBe(result.projectedScore);
    });

    it('correctly computes positive delta for completing a course', () => {
      const result = simulateScoreImpact(baseInput, { completedCoursesDelta: 1 });
      expect(result.delta).toBe(SCORE_WEIGHTS.COURSE);
      expect(result.projectedScore).toBe(SCORE_WEIGHTS.COURSE);
    });

    it('correctly computes positive delta for verifying a credential', () => {
      const result = simulateScoreImpact(baseInput, { verifiedCredentialsDelta: 1 });
      expect(result.delta).toBe(SCORE_WEIGHTS.CREDENTIAL);
    });

    it('does not let projected inputs go below zero', () => {
      const result = simulateScoreImpact(baseInput, { completedCoursesDelta: -10 });
      expect(result.projectedScore).toBeGreaterThanOrEqual(0);
    });

    it('clamps projected score to MAX_SCORE', () => {
      const rich: ReputationInput = {
        completedCourses: 19,
        verifiedCredentials: 1,
        studyStreak: 0,
        totalAchievements: 0,
        rareAchievements: 0,
      };
      // 19*50 + 1*80 = 950 + 80 = 1030, clamped to 1000
      const result = simulateScoreImpact(rich, { completedCoursesDelta: 1 });
      expect(result.projectedScore).toBe(SCORE_WEIGHTS.MAX_SCORE);
    });

    it('reports correct currentScore', () => {
      const input: ReputationInput = { ...baseInput, completedCourses: 2 };
      const { currentScore } = simulateScoreImpact(input, { completedCoursesDelta: 1 });
      expect(currentScore).toBe(calculateScore(input));
    });

    it('rare achievement adds both achievement and rare bonus', () => {
      const result = simulateScoreImpact(baseInput, {
        totalAchievementsDelta: 1,
        rareAchievementsDelta: 1,
      });
      expect(result.delta).toBe(SCORE_WEIGHTS.ACHIEVEMENT + SCORE_WEIGHTS.RARE_BONUS);
    });
  });
});
