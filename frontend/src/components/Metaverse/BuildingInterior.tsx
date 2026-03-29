'use client';

import { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Users, MessageSquare, X, Hand, BookOpen, FlaskConical, Globe, Shield } from 'lucide-react';
import type { CampusBuilding } from '../../types/metaverse';

interface Props {
  building: CampusBuilding;
  onExit: () => void;
}

interface BuildingMeta {
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  content: React.ReactNode;
}

const LECTURE_TOPICS = [
  { label: 'Stellar Consensus Protocol', progress: 65, live: true  },
  { label: 'Soroban Smart Contracts',    progress: 40, live: false },
  { label: 'DeFi Fundamentals',          progress: 80, live: false },
];

const LIBRARY_RESOURCES = [
  { title: 'Stellar Developer Docs',       type: 'Docs',    icon: '📄' },
  { title: 'Soroban SDK Reference',        type: 'SDK',     icon: '🔧' },
  { title: 'Blockchain Whitepaper',        type: 'Paper',   icon: '📑' },
  { title: 'Web3 Architecture Guide',      type: 'Guide',   icon: '🗺️' },
  { title: 'Smart Contract Patterns',      type: 'Course',  icon: '📚' },
];

const LAB_EXERCISES = [
  { name: 'Deploy Hello World Contract', difficulty: 'Beginner',      done: true  },
  { name: 'Token Issuance on Stellar',   difficulty: 'Intermediate',  done: false },
  { name: 'Multi-sig Credential Vault',  difficulty: 'Advanced',      done: false },
];

function LectureContent({ color }: { color: string }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      {/* Slide */}
      <div
        className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border p-6 text-center"
        style={{ borderColor: color + '44', background: color + '11' }}
      >
        <span className="text-5xl">📡</span>
        <p className="text-lg font-bold text-white">Stellar Consensus Protocol</p>
        <p className="text-sm text-slate-400">Federated Byzantine Agreement — how nodes reach consensus</p>
        <span className="rounded-full bg-red-500/20 px-3 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
          ● LIVE
        </span>
      </div>
      {/* Topic list */}
      <div className="space-y-2">
        {LECTURE_TOPICS.map(t => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-2.5">
            {t.live && <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse flex-shrink-0" />}
            <span className="flex-1 text-sm text-slate-200">{t.label}</span>
            <div className="w-24 rounded-full bg-slate-700 h-1.5 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${t.progress}%`, background: color }} />
            </div>
            <span className="text-xs text-slate-500 w-8 text-right">{t.progress}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LibraryContent() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <p className="text-sm text-slate-400 mb-1">Browse curated learning resources</p>
      {LIBRARY_RESOURCES.map(r => (
        <div
          key={r.title}
          className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <span className="text-2xl">{r.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">{r.title}</p>
          </div>
          <span className="rounded-full bg-slate-700 px-2.5 py-0.5 text-xs text-slate-400">{r.type}</span>
        </div>
      ))}
    </div>
  );
}

function LabContent({ color }: { color: string }) {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <p className="text-sm text-slate-400 mb-1">Hands-on smart contract exercises</p>
      {LAB_EXERCISES.map(e => (
        <div
          key={e.name}
          className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3"
        >
          <div
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm ${
              e.done ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-500'
            }`}
          >
            {e.done ? '✓' : '○'}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">{e.name}</p>
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              background: e.difficulty === 'Beginner' ? '#10b98120' : e.difficulty === 'Intermediate' ? '#f59e0b20' : '#ef444420',
              color:      e.difficulty === 'Beginner' ? '#10b981'   : e.difficulty === 'Intermediate' ? '#f59e0b'   : '#ef4444',
            }}
          >
            {e.difficulty}
          </span>
        </div>
      ))}
      <button
        className="mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
        style={{ background: color }}
      >
        Start Next Exercise →
      </button>
    </div>
  );
}

function SocialContent({ color }: { color: string }) {
  const groups = ['Stellar Builders', 'DeFi Study Group', 'NFT Creators', 'Web3 Beginners'];
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <p className="text-sm text-slate-400 mb-1">Active study groups — join and collaborate</p>
      {groups.map((g, i) => (
        <div key={g} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-lg"
            style={{ background: color + '22' }}
          >
            {['🚀', '💰', '🎨', '🌱'][i]}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-200">{g}</p>
            <p className="text-xs text-slate-500">{[12, 8, 5, 20][i]} members active</p>
          </div>
          <button
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: color }}
          >
            Join
          </button>
        </div>
      ))}
    </div>
  );
}

function AdminContent() {
  const services = [
    { label: 'Verify Credential',    icon: <Shield size={16} />,      desc: 'Check on-chain certificate authenticity' },
    { label: 'Enroll in Course',     icon: <BookOpen size={16} />,    desc: 'Browse and register for new courses'     },
    { label: 'View Transcript',      icon: <Globe size={16} />,       desc: 'Download your blockchain transcript'     },
    { label: 'Innovation Lab Access',icon: <FlaskConical size={16} />,desc: 'Request lab environment access'          },
  ];
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      {services.map(s => (
        <button
          key={s.label}
          className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-4 py-3 text-left hover:bg-slate-800 transition-colors"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-300">
            {s.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{s.label}</p>
            <p className="text-xs text-slate-500">{s.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

const BUILDING_META: Record<string, Omit<BuildingMeta, 'content'>> = {
  lecture_hall_a: { title: 'Lecture Hall A',   description: 'Live lecture — Stellar & Soroban smart contracts', icon: '📡', accentColor: '#3b82f6' },
  lecture_hall_b: { title: 'Lecture Hall B',   description: 'Interactive session on DeFi protocols',           icon: '🔗', accentColor: '#6366f1' },
  library:        { title: 'Digital Library',  description: 'Course materials, research papers & resources',   icon: '📚', accentColor: '#8b5cf6' },
  lab:            { title: 'Innovation Lab',   description: 'Hands-on smart contract development',             icon: '⚗️', accentColor: '#10b981' },
  social_hub:     { title: 'Social Hub',       description: 'Connect with peers and join study groups',        icon: '🤝', accentColor: '#f59e0b' },
  admin:          { title: 'Admin Center',     description: 'Credentials, enrollment & support',               icon: '🏛️', accentColor: '#ef4444' },
};

export function BuildingInterior({ building, onExit }: Props) {
  const [micOn,   setMicOn]   = useState(false);
  const [camOn,   setCamOn]   = useState(false);
  const [handUp,  setHandUp]  = useState(false);
  const [message, setMessage] = useState('');
  const [chat,    setChat]    = useState<{ name: string; text: string }[]>([
    { name: 'System', text: `Welcome to ${building.label}! 👋` },
  ]);

  const meta = BUILDING_META[building.id] ?? {
    title: building.label, description: 'Interactive space', icon: '🏫', accentColor: building.color,
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    setChat(c => [...c, { name: 'You', text: message.trim() }]);
    setMessage('');
  };

  const stageContent = (() => {
    if (building.type === 'lecture_hall') return <LectureContent color={meta.accentColor} />;
    if (building.type === 'library')      return <LibraryContent />;
    if (building.type === 'lab')          return <LabContent color={meta.accentColor} />;
    if (building.type === 'social_hub')   return <SocialContent color={meta.accentColor} />;
    if (building.type === 'admin')        return <AdminContent />;
    return <div className="text-6xl">{meta.icon}</div>;
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/97 backdrop-blur-sm">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: meta.accentColor + '33' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl shadow-lg"
            style={{ background: meta.accentColor + '22', border: `1px solid ${meta.accentColor}44` }}
          >
            {meta.icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{meta.title}</h2>
            <p className="text-xs text-slate-400">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: meta.accentColor + '20', color: meta.accentColor }}
          >
            <Users size={12} /> {building.occupants} online
          </span>
          <button
            onClick={onExit}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-red-500 hover:text-red-400"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Stage */}
        <div className="flex flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-8">
          {stageContent}

          {/* Participant grid */}
          {building.occupants > 0 && (
            <div className="mt-2 w-full max-w-2xl">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Participants
              </p>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: Math.min(building.occupants, 12) }, (_, i) => (
                  <div
                    key={i}
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                    style={{ background: meta.accentColor + '18', border: `1px solid ${meta.accentColor}33` }}
                  >
                    {['🧭', '📚', '🎨', '🎓'][i % 4]}
                  </div>
                ))}
                {building.occupants > 12 && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-400">
                    +{building.occupants - 12}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Chat sidebar */}
        <div className="flex w-72 flex-col border-l border-slate-800">
          <div className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <MessageSquare size={12} className="mr-1.5 inline" /> Spatial Chat
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {chat.map((m, i) => (
              <div key={i} className="text-sm">
                <span
                  className="font-semibold"
                  style={{ color: m.name === 'You' ? meta.accentColor : m.name === 'System' ? '#94a3b8' : '#60a5fa' }}
                >
                  {m.name}:{' '}
                </span>
                <span className="text-slate-300">{m.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-slate-800 p-3">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Say something…"
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              className="rounded-lg px-3 py-2 text-sm font-bold text-white transition-colors hover:opacity-90"
              style={{ background: meta.accentColor }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* ── Controls bar ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-3 border-t border-slate-800 py-4">
        <button
          onClick={() => setMicOn(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            micOn ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {micOn ? <Mic size={15} /> : <MicOff size={15} />}
          {micOn ? 'Mute' : 'Unmute'}
        </button>

        <button
          onClick={() => setCamOn(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            camOn ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {camOn ? <Video size={15} /> : <VideoOff size={15} />}
          {camOn ? 'Stop Video' : 'Start Video'}
        </button>

        <button
          onClick={() => setHandUp(v => !v)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
            handUp ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          <Hand size={15} />
          {handUp ? 'Lower Hand' : 'Raise Hand'}
        </button>

        <button
          onClick={onExit}
          className="flex items-center gap-2 rounded-xl bg-red-600/20 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/30"
        >
          <X size={15} /> Leave Space
        </button>
      </div>
    </div>
  );
}
