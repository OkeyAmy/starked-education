'use client';

import { useState, useEffect } from 'react';
import { Users, Wifi, Map, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import type { CampusBuilding } from '../../types/metaverse';

interface Props {
  totalOnline: number;
  buildings: CampusBuilding[];
  onEnterBuilding: (id: string) => void;
}

// Minimap dot positions (normalized -1..1 mapped to the 48px minimap)
const MINIMAP_SIZE = 96; // px
const WORLD_EXTENT = 24; // world units from center to edge

function worldToMinimap(x: number, z: number) {
  const half = MINIMAP_SIZE / 2;
  return {
    left: half + (x / WORLD_EXTENT) * half,
    top:  half + (z / WORLD_EXTENT) * half,
  };
}

export function CampusHUD({ totalOnline, buildings, onEnterBuilding }: Props) {
  const [spacesOpen, setSpacesOpen] = useState(true);

  // Auto-collapse spaces list on mobile screens initially
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setSpacesOpen(false);
    }
  }, []);

  return (
    <>
      {/* ── Top status bar ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 sm:px-6 py-4">
        {/* Brand */}
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur ring-1 ring-slate-700/60 pointer-events-auto">
          <span className="text-base sm:text-lg">🎓</span>
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white hidden sm:inline">StarkEd Metaverse Campus</span>
          <span className="text-xs sm:text-sm font-bold tracking-wide text-white sm:hidden">StarkEd</span>
          <span className="ml-1 rounded-full bg-blue-600/30 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-blue-300">
            BETA
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-2.5 py-1.5 sm:px-3 sm:py-2 backdrop-blur ring-1 ring-slate-700/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
            </span>
            <Users size={13} className="text-green-400" />
            <span className="text-xs sm:text-sm font-bold text-white">{totalOnline.toLocaleString()}</span>
            <span className="text-[10px] sm:text-xs text-slate-400">online</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/80 px-2.5 py-1.5 sm:px-3 sm:py-2 backdrop-blur ring-1 ring-slate-700/60">
            <Wifi size={13} className="text-blue-400" />
            <span className="text-[10px] sm:text-xs font-medium text-slate-300">Live</span>
          </div>
        </div>
      </div>

      {/* ── Left panel: building list + minimap ────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-6 left-4 sm:left-6 w-[calc(100%-2rem)] sm:w-60 space-y-3 pointer-events-none">
        {/* Building list */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/90 p-3 sm:p-4 backdrop-blur shadow-xl pointer-events-auto">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-slate-400">
            <span className="flex items-center gap-2">
              <Map size={12} /> Campus Spaces
            </span>
            <button
              onClick={() => setSpacesOpen(!spacesOpen)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white pointer-events-auto min-h-[32px] min-w-[32px] flex items-center justify-center"
              aria-label="Toggle spaces list"
            >
              {spacesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
          
          {spacesOpen && (
            <div className="space-y-1 mt-3 max-h-48 sm:max-h-none overflow-y-auto">
              {buildings.map(b => {
                const pct = b.capacity > 0 ? Math.round((b.occupants / b.capacity) * 100) : 0;
                const busy = pct > 75;
                return (
                  <button
                    key={b.id}
                    onClick={() => b.isOpen && onEnterBuilding(b.id)}
                    disabled={!b.isOpen}
                    className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 sm:py-2 text-left text-xs transition-all min-h-[40px] sm:min-h-0 ${
                      b.isOpen
                        ? 'hover:bg-slate-800 cursor-pointer'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    {/* Color dot */}
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: b.color }}
                    />
                    <span className="flex-1 font-medium text-slate-200 group-hover:text-white truncate">
                      {b.label}
                    </span>
                    {b.isOpen ? (
                      <span className={`font-semibold tabular-nums ${busy ? 'text-orange-400' : 'text-slate-400'}`}>
                        {b.occupants}
                      </span>
                    ) : (
                      <Lock size={10} className="text-slate-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Minimap */}
        <div className="hidden sm:block rounded-2xl border border-slate-700/70 bg-slate-900/90 p-3 backdrop-blur shadow-xl pointer-events-auto">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Minimap
          </div>
          <div
            className="relative rounded-xl bg-slate-800 overflow-hidden"
            style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
            {/* Center plaza */}
            <div
              className="absolute rounded-full bg-slate-600/60"
              style={{ width: 12, height: 12, left: MINIMAP_SIZE / 2 - 6, top: MINIMAP_SIZE / 2 - 6 }}
            />
            {/* Building dots */}
            {buildings.map(b => {
              const { left, top } = worldToMinimap(b.position[0], b.position[2]);
              return (
                <div
                  key={b.id}
                  title={b.label}
                  className="absolute rounded-sm cursor-pointer hover:scale-150 transition-transform"
                  style={{
                    width: 8, height: 8,
                    left: left - 4, top: top - 4,
                    background: b.color,
                    boxShadow: `0 0 4px ${b.color}`,
                  }}
                />
              );
            })}
            {/* Local player dot */}
            <div
              className="absolute rounded-full bg-yellow-400 ring-1 ring-white animate-pulse"
              style={{ width: 6, height: 6, left: MINIMAP_SIZE / 2 - 3, top: MINIMAP_SIZE / 2 - 3 }}
            />
          </div>
        </div>
      </div>

      {/* ── Controls hint ───────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute bottom-16 sm:bottom-6 right-4 sm:right-6 rounded-xl bg-slate-900/80 px-4 py-3 backdrop-blur ring-1 ring-slate-700/60 hidden sm:block">
        <p className="text-xs text-slate-400">
          🖱 Drag to orbit &nbsp;•&nbsp; Scroll to zoom &nbsp;•&nbsp; Click building to enter
        </p>
      </div>
    </>
  );
}
