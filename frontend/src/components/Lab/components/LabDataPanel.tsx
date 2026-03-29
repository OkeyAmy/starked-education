'use client';

import { useMemo } from 'react';
import type { LabExperimentEvent, LabMeasurementPoint } from '../../../types/lab';
import { LabTemperatureChart } from './LabTemperatureChart';

export function LabDataPanel({
  series,
  measurement,
  events
}: {
  series: LabMeasurementPoint[];
  measurement: LabMeasurementPoint;
  events: LabExperimentEvent[];
}) {
  const latest = useMemo(() => series[series.length - 1] ?? measurement, [measurement, series]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Measurements</p>
          <p className="mt-1 text-sm text-slate-600">Live temperature and pH recording with export-ready dataset.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">t={latest.t.toFixed(1)}s</span>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">{latest.temperatureC.toFixed(1)}°C</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">pH {latest.ph.toFixed(2)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">events {events.length}</span>
        </div>
      </div>

      <div className="mt-4">
        <LabTemperatureChart series={series} />
      </div>
    </div>
  );
}
