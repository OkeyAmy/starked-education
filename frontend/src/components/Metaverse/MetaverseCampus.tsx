'use client';

import dynamic from 'next/dynamic';
import { AvatarCustomizer } from './AvatarCustomizer';
import { BuildingInterior } from './BuildingInterior';
import { CampusHUD } from './CampusHUD';
import { useMetaverseCampus } from '../../hooks/useMetaverseCampus';

// Dynamically import the 3D scene to avoid SSR issues with Three.js
const CampusScene = dynamic(
  () => import('./CampusScene').then(m => ({ default: m.CampusScene })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">Loading campus…</div> }
);

export function MetaverseCampus() {
  const { state, initUser, enterBuilding, exitBuilding } = useMetaverseCampus();

  const activeBuilding = state.buildings.find(b => b.id === state.activeBuilding) ?? null;

  // Step 1: avatar creation
  if (!state.localUser) {
    return <AvatarCustomizer onConfirm={initUser} />;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      <CampusScene
        buildings={state.buildings}
        users={state.users}
        localUser={state.localUser}
        onEnterBuilding={enterBuilding}
      />

      <CampusHUD
        totalOnline={state.totalOnline}
        buildings={state.buildings}
        onEnterBuilding={enterBuilding}
      />

      {activeBuilding && (
        <BuildingInterior building={activeBuilding} onExit={exitBuilding} />
      )}
    </div>
  );
}
