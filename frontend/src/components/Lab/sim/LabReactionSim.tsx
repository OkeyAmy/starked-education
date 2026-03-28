'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import type { LabChemical, LabMeasurementPoint } from '../../../types/lab';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function phToCss(ph: number) {
  const t = clamp((ph - 1) / 13, 0, 1);
  if (t < 0.5) {
    return `rgba(${Math.round(239 + (34 - 239) * (t / 0.5))},${Math.round(68 + (197 - 68) * (t / 0.5))},${Math.round(68 + (94 - 68) * (t / 0.5))},0.85)`;
  }
  const tt = (t - 0.5) / 0.5;
  return `rgba(${Math.round(34 + (59 - 34) * tt)},${Math.round(197 + (130 - 197) * tt)},${Math.round(94 + (246 - 94) * tt)},0.85)`;
}

export function LabReactionSim({
  chemicals,
  isStirring,
  measurement,
  onAddChemical,
  blocked
}: {
  chemicals: Record<LabChemical, number>;
  isStirring: boolean;
  measurement: LabMeasurementPoint;
  onAddChemical: (chemical: LabChemical) => void;
  blocked: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);

  const [particleCount, setParticleCount] = useState(0);

  const solutionColor = useMemo(() => phToCss(measurement.ph), [measurement.ph]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const engine = Matter.Engine.create({ enableSleeping: true });
    engineRef.current = engine;

    const render = Matter.Render.create({
      element: container,
      engine,
      options: {
        width,
        height,
        background: '#ffffff',
        wireframes: false
      }
    });
    renderRef.current = render;

    const ground = Matter.Bodies.rectangle(width / 2, height - 18, width, 36, { isStatic: true, render: { fillStyle: '#0f172a' } });
    const left = Matter.Bodies.rectangle(10, height / 2, 20, height, { isStatic: true, render: { fillStyle: '#e2e8f0' } });
    const right = Matter.Bodies.rectangle(width - 10, height / 2, 20, height, { isStatic: true, render: { fillStyle: '#e2e8f0' } });

    Matter.Composite.add(engine.world, [ground, left, right]);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;

    Matter.Render.run(render);
    Matter.Runner.run(runner, engine);

    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      render.canvas.remove();
      render.textures = {};
    };
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const handler = () => {
      if (!engineRef.current) return;
      const bodies = Matter.Composite.allBodies(engine.world).filter((b) => (b.label || '').startsWith('chem_'));
      setParticleCount(bodies.length);
    };

    const interval = window.setInterval(handler, 800);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const gravityBase = isStirring ? 0.86 : 1;
    engine.gravity.y = gravityBase;

    const bodies = Matter.Composite.allBodies(engine.world).filter((b) => (b.label || '').startsWith('chem_'));
    bodies.forEach((body) => {
      if (isStirring) {
        Matter.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * 0.0008,
          y: (Math.random() - 0.5) * 0.0003
        });
      }
      body.frictionAir = isStirring ? 0.015 : 0.04;
    });
  }, [isStirring, chemicals.acid, chemicals.base]);

  const spawn = (chemical: LabChemical) => {
    const engine = engineRef.current;
    const render = renderRef.current;
    if (!engine || !render) return;

    const width = render.options.width ?? 360;

    const fill = chemical === 'acid' ? '#ef4444' : chemical === 'base' ? '#3b82f6' : '#22c55e';
    const label = `chem_${chemical}`;

    const count = chemical === 'indicator' ? 6 : 12;

    const particles = Array.from({ length: count }, () => {
      const radius = chemical === 'indicator' ? 6 : 7;
      return Matter.Bodies.circle(width * (0.2 + Math.random() * 0.6), 60 + Math.random() * 20, radius, {
        restitution: 0.4,
        friction: 0.05,
        frictionAir: 0.04,
        density: 0.0014,
        label,
        render: {
          fillStyle: fill
        }
      });
    });

    Matter.Composite.add(engine.world, particles);
  };

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    const bodies = Matter.Composite.allBodies(engine.world);
    bodies.forEach((body) => {
      if (!body.label.startsWith('chem_')) {
        return;
      }

      (body.render as any).fillStyle = body.label.includes('indicator') ? solutionColor : (body.render as any).fillStyle;
    });
  }, [solutionColor]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute left-4 top-4 z-10 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700 shadow">
        <p className="font-semibold">Mixing simulation</p>
        <p className="mt-1 text-xs text-slate-500">particles: {particleCount}</p>
        <p className="mt-1 text-xs text-slate-500">solution: {measurement.temperatureC.toFixed(1)}°C · pH {measurement.ph.toFixed(2)}</p>
      </div>

      {blocked && (
        <div className="absolute inset-x-4 top-20 z-10 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow">
          Add PPE first to add chemicals.
        </div>
      )}

      <div ref={containerRef} className="h-full w-full" />

      <div className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-3 gap-2">
        <button
          onClick={() => {
            if (blocked) return;
            onAddChemical('acid');
            spawn('acid');
          }}
          className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-rose-500 disabled:opacity-60"
          disabled={blocked}
        >
          Add acid
        </button>
        <button
          onClick={() => {
            if (blocked) return;
            onAddChemical('base');
            spawn('base');
          }}
          className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-60"
          disabled={blocked}
        >
          Add base
        </button>
        <button
          onClick={() => {
            onAddChemical('indicator');
            spawn('indicator');
          }}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Add indicator
        </button>
      </div>
    </div>
  );
}
