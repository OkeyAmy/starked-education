import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarConfig, CampusBuilding, CampusUser, MetaverseState } from '../types/metaverse';

const CAMPUS_BUILDINGS: CampusBuilding[] = [
  { id: 'lecture_hall_a', type: 'lecture_hall', label: 'Lecture Hall A', position: [-12, 0, -8], color: '#3b82f6', capacity: 500, occupants: 0, isOpen: true },
  { id: 'lecture_hall_b', type: 'lecture_hall', label: 'Lecture Hall B', position: [12, 0, -8],  color: '#6366f1', capacity: 500, occupants: 0, isOpen: true },
  { id: 'library',        type: 'library',      label: 'Library',        position: [0, 0, -18],  color: '#8b5cf6', capacity: 200, occupants: 0, isOpen: true },
  { id: 'lab',            type: 'lab',          label: 'Innovation Lab',  position: [-18, 0, 4],  color: '#10b981', capacity: 100, occupants: 0, isOpen: true },
  { id: 'social_hub',     type: 'social_hub',   label: 'Social Hub',     position: [18, 0, 4],   color: '#f59e0b', capacity: 300, occupants: 0, isOpen: true },
  { id: 'admin',          type: 'admin',        label: 'Admin Center',   position: [0, 0, 14],   color: '#ef4444', capacity: 50,  occupants: 0, isOpen: true },
];

// Deterministic mock peers so SSR and client match
const MOCK_PEERS: CampusUser[] = Array.from({ length: 8 }, (_, i) => ({
  id: `peer-${i}`,
  avatar: {
    style: (['explorer', 'scholar', 'creator', 'mentor'] as const)[i % 4],
    color: (['blue', 'purple', 'green', 'orange', 'red', 'teal'] as const)[i % 6],
    name: `Student ${i + 1}`,
  },
  position: [Math.cos((i / 8) * Math.PI * 2) * 6, 0, Math.sin((i / 8) * Math.PI * 2) * 6],
  currentBuilding: null,
  isSpeaking: false,
  isMuted: true,
  isCameraOn: false,
}));

export function useMetaverseCampus() {
  const [state, setState] = useState<MetaverseState>({
    localUser: null,
    users: MOCK_PEERS,
    buildings: CAMPUS_BUILDINGS,
    activeBuilding: null,
    totalOnline: 1247,
  });

  const wsRef = useRef<WebSocket | null>(null);

  const initUser = useCallback((avatar: AvatarConfig) => {
    const user: CampusUser = {
      id: `local-${Date.now()}`,
      avatar,
      position: [0, 0, 0],
      currentBuilding: null,
      isSpeaking: false,
      isMuted: false,
      isCameraOn: false,
    };
    setState(s => ({ ...s, localUser: user }));
  }, []);

  const enterBuilding = useCallback((buildingId: string) => {
    setState(s => ({
      ...s,
      activeBuilding: buildingId,
      localUser: s.localUser ? { ...s.localUser, currentBuilding: buildingId } : null,
      buildings: s.buildings.map(b =>
        b.id === buildingId ? { ...b, occupants: b.occupants + 1 } : b
      ),
    }));
  }, []);

  const exitBuilding = useCallback(() => {
    setState(s => ({
      ...s,
      activeBuilding: null,
      localUser: s.localUser ? { ...s.localUser, currentBuilding: null } : null,
      buildings: s.buildings.map(b =>
        b.id === s.activeBuilding ? { ...b, occupants: Math.max(0, b.occupants - 1) } : b
      ),
    }));
  }, []);

  // Simulate live occupancy updates
  useEffect(() => {
    const interval = setInterval(() => {
      setState(s => ({
        ...s,
        totalOnline: s.totalOnline + Math.floor(Math.random() * 5) - 2,
        buildings: s.buildings.map(b => ({
          ...b,
          occupants: Math.max(0, Math.min(b.capacity, b.occupants + Math.floor(Math.random() * 3) - 1)),
        })),
      }));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return { state, initUser, enterBuilding, exitBuilding };
}
