'use client';

import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { LabHazard } from '../../../types/lab';

export function LabHazardBanner({ hazard }: { hazard: LabHazard }) {
  const style =
    hazard.level === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-800'
      : hazard.level === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-800';

  const Icon = hazard.level === 'danger' ? ShieldAlert : AlertTriangle;

  return (
    <div className={`rounded-3xl border px-5 py-4 ${style}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5" />
        <div>
          <p className="text-sm font-semibold">{hazard.title}</p>
          <p className="mt-1 text-sm opacity-80">{hazard.message}</p>
        </div>
      </div>
    </div>
  );
}
