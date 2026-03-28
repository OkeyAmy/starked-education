'use client';

import { ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import type { LabExperimentStep, LabHazard, LabPPE } from '../../../types/lab';

export function LabGuidancePanel({
  steps,
  stepIndex,
  onNext,
  onPrev,
  hazards,
  ppe
}: {
  steps: LabExperimentStep[];
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  hazards: LabHazard[];
  ppe: LabPPE;
}) {
  const step = steps[stepIndex];
  const missing = (step.requiresPPE ?? []).filter((key) => !ppe[key]);

  const latestHazard = hazards.length > 0 ? hazards[hazards.length - 1] : null;

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{step.title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>

        {missing.length > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Required PPE missing:</span>
              <span className="opacity-90">{missing.join(', ')}</span>
            </div>
          </div>
        )}

        {latestHazard && (
          <p className="mt-3 text-xs text-slate-500">Latest hazard: {latestHazard.title}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onPrev}
          disabled={stepIndex === 0}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={stepIndex >= steps.length - 1}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
