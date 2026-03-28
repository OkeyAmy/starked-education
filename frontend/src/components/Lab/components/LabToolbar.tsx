'use client';

import { Beaker, Fan, Hand, Shield, Thermometer, Wind } from 'lucide-react';
import type { LabChemical, LabMeasurementPoint, LabPPE } from '../../../types/lab';

function pill(enabled: boolean) {
  return enabled
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
}

export function LabToolbar({
  ppe,
  onTogglePPE,
  onAddChemical,
  onToggleStir,
  isStirring,
  canAddChemicals,
  measurement
}: {
  ppe: LabPPE;
  onTogglePPE: (key: keyof LabPPE) => void;
  onAddChemical: (chemical: LabChemical, amount: number) => void;
  onToggleStir: () => void;
  isStirring: boolean;
  canAddChemicals: boolean;
  measurement: LabMeasurementPoint;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Safety controls</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTogglePPE('goggles')}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(ppe.goggles)}`}
          >
            <Shield className="h-4 w-4" />
            Goggles
          </button>
          <button
            onClick={() => onTogglePPE('gloves')}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(ppe.gloves)}`}
          >
            <Hand className="h-4 w-4" />
            Gloves
          </button>
          <button
            onClick={() => onTogglePPE('labCoat')}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(ppe.labCoat)}`}
          >
            <Shield className="h-4 w-4" />
            Lab coat
          </button>
          <button
            onClick={() => onTogglePPE('fumeHood')}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(ppe.fumeHood)}`}
          >
            <Fan className="h-4 w-4" />
            Fume hood
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-900">Experiment actions</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onAddChemical('acid', 10)}
            disabled={!canAddChemicals}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(false)} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Beaker className="h-4 w-4" />
            Add acid
          </button>
          <button
            onClick={() => onAddChemical('base', 10)}
            disabled={!canAddChemicals}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(false)} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Beaker className="h-4 w-4" />
            Add base
          </button>
          <button
            onClick={onToggleStir}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${pill(isStirring)}`}
          >
            <Wind className="h-4 w-4" />
            {isStirring ? 'Stop stirring' : 'Stir'}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
            <Thermometer className="h-4 w-4" />
            {measurement.temperatureC.toFixed(1)}°C · pH {measurement.ph.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
