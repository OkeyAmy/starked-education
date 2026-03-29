'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  LabChemical,
  LabExperimentEvent,
  LabExperimentSnapshot,
  LabExperimentStep,
  LabHazard,
  LabPPE,
  LabMeasurementPoint
} from '../types/lab';

function now() {
  return Date.now();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

const defaultPPE: LabPPE = {
  goggles: false,
  gloves: false,
  labCoat: false,
  fumeHood: false
};

const experimentSteps: LabExperimentStep[] = [
  {
    id: 'ppe',
    title: 'Wear PPE',
    description: 'Put on goggles, gloves, and a lab coat. Use the fume hood when handling strong acids/bases.',
    requiresPPE: ['goggles', 'gloves', 'labCoat']
  },
  {
    id: 'setup',
    title: 'Prepare the beaker',
    description: 'Place the beaker on the bench and ensure the workspace is clear.'
  },
  {
    id: 'add-acid',
    title: 'Add acid',
    description: 'Add acid to the beaker in a controlled amount (simulated).',
    requiresPPE: ['goggles', 'gloves', 'labCoat']
  },
  {
    id: 'add-base',
    title: 'Add base',
    description: 'Add base to neutralize the acid. Observe temperature and pH shift.',
    requiresPPE: ['goggles', 'gloves', 'labCoat']
  },
  {
    id: 'stir',
    title: 'Stir and observe',
    description: 'Stir gently to accelerate mixing. Watch the indicator color change and record the measurements.'
  },
  {
    id: 'analyze',
    title: 'Analyze and export',
    description: 'Review the temperature and pH curve, then export your data and event log.'
  }
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computePh(acidMl: number, baseMl: number) {
  const delta = baseMl - acidMl;
  const scaled = clamp(delta / 50, -1, 1);
  return 7 + scaled * 6;
}

function computeTemperatureC(acidMl: number, baseMl: number, isStirring: boolean, tSeconds: number) {
  const limiting = Math.min(acidMl, baseMl);
  const heat = limiting * 0.06;
  const mixingBonus = isStirring ? 1.25 : 1;
  const peak = 22 + heat * mixingBonus;
  const cooling = Math.exp(-tSeconds / 24);
  const target = 22 + (peak - 22) * cooling;
  return clamp(target, 18, 65);
}

function hazardFor(snapshot: LabExperimentSnapshot): LabHazard[] {
  const hazards: LabHazard[] = [];
  const totalReactive = snapshot.chemicals.acid + snapshot.chemicals.base;

  if (totalReactive > 0 && (!snapshot.ppe.goggles || !snapshot.ppe.gloves || !snapshot.ppe.labCoat)) {
    hazards.push({
      id: uid('hazard'),
      level: 'danger',
      title: 'PPE required',
      message: 'Hazard: chemical handling without full PPE. Put on goggles, gloves, and a lab coat.',
      at: now()
    });
  }

  if ((snapshot.chemicals.acid >= 60 || snapshot.chemicals.base >= 60) && !snapshot.ppe.fumeHood) {
    hazards.push({
      id: uid('hazard'),
      level: 'warning',
      title: 'Use fume hood',
      message: 'Recommendation: enable the fume hood for larger volumes to reduce exposure risk.',
      at: now()
    });
  }

  if (snapshot.measurement.temperatureC > 45) {
    hazards.push({
      id: uid('hazard'),
      level: 'warning',
      title: 'Exothermic reaction',
      message: 'Temperature spike detected. Avoid rapid additions and keep stirring gentle.',
      at: now()
    });
  }

  return hazards;
}

export function useLabExperiment() {
  const [stepIndex, setStepIndex] = useState(0);
  const [ppe, setPpe] = useState<LabPPE>(defaultPPE);
  const [chemicals, setChemicals] = useState<Record<LabChemical, number>>({ acid: 0, base: 0, indicator: 1 });
  const [isStirring, setIsStirring] = useState(false);
  const [series, setSeries] = useState<LabMeasurementPoint[]>([]);
  const [events, setEvents] = useState<LabExperimentEvent[]>([]);
  const [hazards, setHazards] = useState<LabHazard[]>([]);

  const startAtRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const measurement = useMemo<LabMeasurementPoint>(() => {
    const startAt = startAtRef.current ?? now();
    const t = (now() - startAt) / 1000;
    return {
      t,
      temperatureC: computeTemperatureC(chemicals.acid, chemicals.base, isStirring, t),
      ph: computePh(chemicals.acid, chemicals.base)
    };
  }, [chemicals, isStirring]);

  const snapshot = useMemo<LabExperimentSnapshot>(() => ({
    experimentId: 'acid-base-neutralization',
    stepIndex,
    ppe,
    chemicals,
    isStirring,
    measurement,
    series,
    hazards,
    events
  }), [chemicals, events, hazards, isStirring, measurement, ppe, series, stepIndex]);

  const steps = useMemo(() => experimentSteps, []);

  const addEvent = useCallback((type: LabExperimentEvent['type'], payload: Record<string, unknown>) => {
    setEvents((current) => [...current, { id: uid('evt'), type, payload, at: now() }]);
  }, []);

  const start = useCallback(() => {
    if (startAtRef.current) {
      return;
    }

    startAtRef.current = now();
    setSeries([]);
    setHazards([]);
    setEvents([]);
    addEvent('collaboration', { action: 'start' });

    timerRef.current = window.setInterval(() => {
      setSeries((current) => {
        const startAt = startAtRef.current ?? now();
        const t = (now() - startAt) / 1000;
        const point: LabMeasurementPoint = {
          t,
          temperatureC: computeTemperatureC(chemicals.acid, chemicals.base, isStirring, t),
          ph: computePh(chemicals.acid, chemicals.base)
        };
        return current.length > 600 ? [...current.slice(-600), point] : [...current, point];
      });
    }, 600);
  }, [addEvent, chemicals.acid, chemicals.base, isStirring]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    addEvent('collaboration', { action: 'stop' });
  }, [addEvent]);

  useEffect(() => () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
  }, []);

  useEffect(() => {
    const nextHazards = hazardFor({
      experimentId: 'acid-base-neutralization',
      stepIndex,
      ppe,
      chemicals,
      isStirring,
      measurement,
      series,
      hazards: [],
      events: []
    });

    setHazards((current) => {
      const existingKeys = new Set(current.map((h) => `${h.level}:${h.title}`));
      const merged = [...current];
      nextHazards.forEach((h) => {
        const key = `${h.level}:${h.title}`;
        if (!existingKeys.has(key)) {
          merged.push(h);
          addEvent('hazard', { level: h.level, title: h.title, message: h.message });
        }
      });
      return merged;
    });
  }, [addEvent, chemicals, isStirring, measurement, ppe, series, stepIndex]);

  const togglePPE = useCallback((key: keyof LabPPE) => {
    setPpe((current) => {
      const updated = { ...current, [key]: !current[key] };
      addEvent('ppe', { [key]: updated[key] });
      return updated;
    });
  }, [addEvent]);

  const addChemical = useCallback((chemical: LabChemical, ml: number) => {
    setChemicals((current) => {
      const updated = { ...current, [chemical]: clamp((current[chemical] ?? 0) + ml, 0, 120) };
      addEvent('add-chemical', { chemical, ml, totalMl: updated[chemical] });
      return updated;
    });
  }, [addEvent]);

  const setStirring = useCallback((value: boolean) => {
    setIsStirring(value);
    addEvent('stir', { enabled: value });
  }, [addEvent]);

  const nextStep = useCallback(() => {
    setStepIndex((current) => {
      const next = Math.min(current + 1, experimentSteps.length - 1);
      if (next !== current) {
        addEvent('step', { from: current, to: next, id: experimentSteps[next].id });
      }
      return next;
    });
  }, [addEvent]);

  const previousStep = useCallback(() => {
    setStepIndex((current) => {
      const next = Math.max(current - 1, 0);
      if (next !== current) {
        addEvent('step', { from: current, to: next, id: experimentSteps[next].id });
      }
      return next;
    });
  }, [addEvent]);

  const reset = useCallback(() => {
    stop();
    startAtRef.current = null;
    setStepIndex(0);
    setPpe(defaultPPE);
    setChemicals({ acid: 0, base: 0, indicator: 1 });
    setIsStirring(false);
    setSeries([]);
    setEvents([]);
    setHazards([]);
  }, [stop]);

  const addNote = useCallback((note: string) => {
    addEvent('note', { note });
  }, [addEvent]);

  return {
    steps,
    stepIndex,
    setStepIndex,
    nextStep,
    previousStep,
    start,
    stop,
    reset,
    ppe,
    togglePPE,
    chemicals,
    addChemical,
    isStirring,
    setStirring,
    series,
    hazards,
    events,
    measurement,
    snapshot,
    addNote
  };
}
