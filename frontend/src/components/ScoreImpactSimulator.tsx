'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  calculateScoreBreakdown,
  simulateScoreImpact,
  SCORE_WEIGHTS,
  type ReputationInput,
  type SimulatedAction,
} from '../lib/reputationMath';

interface ScoreImpactSimulatorProps {
  current: ReputationInput;
}

const ACTIONS: { label: string; action: SimulatedAction; description: string }[] = [
  {
    label: 'Complete a Course',
    description: `+${SCORE_WEIGHTS.COURSE} pts`,
    action: { completedCoursesDelta: 1 },
  },
  {
    label: 'Verify a Credential',
    description: `+${SCORE_WEIGHTS.CREDENTIAL} pts`,
    action: { verifiedCredentialsDelta: 1 },
  },
  {
    label: 'Extend Streak (+7 days)',
    description: `+${SCORE_WEIGHTS.STREAK * 7} pts`,
    action: { studyStreakDelta: 7 },
  },
  {
    label: 'Earn an Achievement',
    description: `+${SCORE_WEIGHTS.ACHIEVEMENT} pts`,
    action: { totalAchievementsDelta: 1 },
  },
  {
    label: 'Earn a Rare Achievement',
    description: `+${SCORE_WEIGHTS.ACHIEVEMENT + SCORE_WEIGHTS.RARE_BONUS} pts`,
    action: { totalAchievementsDelta: 1, rareAchievementsDelta: 1 },
  },
];

export function ScoreImpactSimulator({ current }: ScoreImpactSimulatorProps) {
  const [selectedAction, setSelectedAction] = useState<SimulatedAction | null>(null);

  const currentBreakdown = useMemo(() => calculateScoreBreakdown(current), [current]);

  const simulation = useMemo(
    () => (selectedAction ? simulateScoreImpact(current, selectedAction) : null),
    [current, selectedAction],
  );

  const deltaSign = simulation
    ? simulation.delta > 0
      ? 'positive'
      : simulation.delta < 0
        ? 'negative'
        : 'neutral'
    : 'neutral';

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Score Impact Simulator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current score */}
        <div className="flex items-center justify-between rounded-md bg-muted px-4 py-3">
          <span className="text-sm text-muted-foreground">Current Score</span>
          <span className="text-2xl font-bold">{currentBreakdown.total}</span>
        </div>

        {/* Score breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>Courses: +{currentBreakdown.base}</span>
          <span>Credentials: +{currentBreakdown.credentialScore}</span>
          <span>Streak: +{currentBreakdown.streakScore}</span>
          <span>Achievements: +{currentBreakdown.achievementScore}</span>
          <span>Rare bonus: +{currentBreakdown.rareBonus}</span>
          <span className="text-foreground font-medium">Max: {SCORE_WEIGHTS.MAX_SCORE}</span>
        </div>

        {/* Action picker */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Simulate an action:</p>
          {ACTIONS.map((a) => {
            const isSelected = selectedAction === a.action;
            return (
              <button
                key={a.label}
                onClick={() => setSelectedAction(isSelected ? null : a.action)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted'
                }`}
                aria-pressed={isSelected}
              >
                <span>{a.label}</span>
                <Badge variant="secondary">{a.description}</Badge>
              </button>
            );
          })}
        </div>

        {/* Simulation result */}
        {simulation && (
          <div
            className={`flex items-center justify-between rounded-md border px-4 py-3 ${
              deltaSign === 'positive'
                ? 'border-green-500/30 bg-green-500/10'
                : deltaSign === 'negative'
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-border bg-muted'
            }`}
            role="status"
            aria-live="polite"
          >
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Projected Score</p>
              <p className="text-2xl font-bold">{simulation.projectedScore}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold">
              {deltaSign === 'positive' ? (
                <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
              ) : deltaSign === 'negative' ? (
                <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
              ) : (
                <Minus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span
                className={
                  deltaSign === 'positive'
                    ? 'text-green-600'
                    : deltaSign === 'negative'
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                }
              >
                {simulation.delta > 0 ? '+' : ''}
                {simulation.delta}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
