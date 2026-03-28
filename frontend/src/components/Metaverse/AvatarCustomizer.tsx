'use client';

import { useState } from 'react';
import type { AvatarColor, AvatarConfig, AvatarStyle } from '../../types/metaverse';

const STYLES: { value: AvatarStyle; label: string; icon: string; desc: string }[] = [
  { value: 'explorer', label: 'Explorer', icon: '🧭', desc: 'Curious & adventurous' },
  { value: 'scholar',  label: 'Scholar',  icon: '📚', desc: 'Deep & analytical'    },
  { value: 'creator',  label: 'Creator',  icon: '🎨', desc: 'Inventive & artistic'  },
  { value: 'mentor',   label: 'Mentor',   icon: '🎓', desc: 'Wise & supportive'     },
];

const COLORS: { value: AvatarColor; hex: string; name: string }[] = [
  { value: 'blue',   hex: '#3b82f6', name: 'Ocean'   },
  { value: 'purple', hex: '#8b5cf6', name: 'Cosmic'  },
  { value: 'green',  hex: '#10b981', name: 'Forest'  },
  { value: 'orange', hex: '#f59e0b', name: 'Solar'   },
  { value: 'red',    hex: '#ef4444', name: 'Ember'   },
  { value: 'teal',   hex: '#14b8a6', name: 'Lagoon'  },
];

interface Props {
  onConfirm: (config: AvatarConfig) => void;
}

export function AvatarCustomizer({ onConfirm }: Props) {
  const [name,  setName]  = useState('');
  const [style, setStyle] = useState<AvatarStyle>('explorer');
  const [color, setColor] = useState<AvatarColor>('blue');

  const selectedStyle = STYLES.find(s => s.value === style)!;
  const selectedColor = COLORS.find(c => c.value === color)!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-0 opacity-10 transition-all duration-700"
        style={{ background: `radial-gradient(ellipse at 50% 40%, ${selectedColor.hex}, transparent 70%)` }}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/60 bg-slate-900/95 p-8 shadow-2xl backdrop-blur">
        {/* Header */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">Create Your Avatar</h2>
          <p className="mt-1 text-sm text-slate-400">Customize your campus identity before entering</p>
        </div>

        {/* Avatar preview */}
        <div className="mx-auto mb-8 flex flex-col items-center">
          <div className="relative">
            {/* Glow ring */}
            <div
              className="absolute -inset-3 rounded-full opacity-30 blur-xl transition-all duration-500"
              style={{ background: selectedColor.hex }}
            />
            {/* Body silhouette */}
            <div className="relative flex flex-col items-center gap-0">
              {/* Head */}
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-3xl shadow-lg ring-4 ring-white/10 transition-all duration-300"
                style={{ background: `linear-gradient(135deg, ${selectedColor.hex}, ${selectedColor.hex}99)` }}
              >
                {selectedStyle.icon}
              </div>
              {/* Neck */}
              <div className="h-2 w-4 rounded-b" style={{ background: selectedColor.hex }} />
              {/* Torso */}
              <div
                className="flex h-14 w-20 items-center justify-center rounded-xl text-xs font-bold text-white/80 shadow-md transition-all duration-300"
                style={{ background: `linear-gradient(180deg, ${selectedColor.hex}cc, ${selectedColor.hex}66)` }}
              >
                {selectedStyle.label}
              </div>
              {/* Legs */}
              <div className="flex gap-2 pt-0.5">
                {[0, 1].map(i => (
                  <div
                    key={i}
                    className="h-10 w-7 rounded-b-xl transition-all duration-300"
                    style={{ background: `${selectedColor.hex}88` }}
                  />
                ))}
              </div>
            </div>
          </div>
          {/* Name tag preview */}
          <div className="mt-3 rounded-full bg-slate-800 px-4 py-1 text-sm font-semibold text-white ring-1 ring-slate-600">
            {name.trim() || 'Your Name'}
          </div>
          <p className="mt-1 text-xs text-slate-500 italic">{selectedStyle.desc}</p>
        </div>

        {/* Display name */}
        <label className="mb-1 block text-sm font-medium text-slate-300">Display Name</label>
        <input
          type="text"
          maxLength={24}
          placeholder="Enter your name…"
          value={name}
          onChange={e => setName(e.target.value)}
          className="mb-6 w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        />

        {/* Style selector */}
        <label className="mb-2 block text-sm font-medium text-slate-300">Avatar Style</label>
        <div className="mb-6 grid grid-cols-4 gap-2">
          {STYLES.map(s => (
            <button
              key={s.value}
              onClick={() => setStyle(s.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs transition-all ${
                style === s.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300 shadow-md shadow-blue-500/20'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:bg-slate-750'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <span className="font-medium">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Color selector */}
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Color Theme &mdash; <span className="text-slate-400 font-normal">{selectedColor.name}</span>
        </label>
        <div className="mb-8 flex gap-3">
          {COLORS.map(c => (
            <button
              key={c.value}
              title={c.name}
              onClick={() => setColor(c.value)}
              className={`h-9 w-9 rounded-full transition-all duration-200 ${
                color === c.value
                  ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                  : 'hover:scale-110 opacity-70 hover:opacity-100'
              }`}
              style={{ background: c.hex, boxShadow: color === c.value ? `0 0 12px ${c.hex}` : undefined }}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          disabled={!name.trim()}
          onClick={() => onConfirm({ style, color, name: name.trim() })}
          className="w-full rounded-xl py-3.5 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: name.trim()
              ? `linear-gradient(135deg, ${selectedColor.hex}, ${selectedColor.hex}bb)`
              : undefined,
          }}
        >
          Enter Campus →
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          1,000,000+ unique avatar combinations available
        </p>
      </div>
    </div>
  );
}
