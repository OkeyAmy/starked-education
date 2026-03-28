'use client';

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { CampusBuilding, CampusUser } from '../../types/metaverse';

// ─── Building ────────────────────────────────────────────────────────────────

function Building({
  building,
  onEnter,
}: {
  building: CampusBuilding;
  onEnter: (id: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(
        meshRef.current.scale.y,
        hovered ? 1.06 : 1,
        0.1
      );
    }
  });

  const height = building.type === 'lecture_hall' ? 4 : building.type === 'library' ? 5 : 3;
  const width  = building.type === 'social_hub'   ? 5 : 4;

  return (
    <group position={building.position}>
      {/* Main body */}
      <mesh
        ref={meshRef}
        position={[0, height / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => building.isOpen && onEnter(building.id)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={building.color}
          emissive={building.color}
          emissiveIntensity={hovered ? 0.25 : 0.05}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Roof accent */}
      <mesh position={[0, height + 0.3, 0]} castShadow>
        <boxGeometry args={[width + 0.4, 0.3, width + 0.4]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} />
      </mesh>

      {/* Windows */}
      {[-1, 0, 1].map((x) =>
        [1, 2.5].map((y) => (
          <mesh key={`${x}-${y}`} position={[x * 1.2, y, width / 2 + 0.01]}>
            <planeGeometry args={[0.6, 0.8]} />
            <meshStandardMaterial
              color="#bfdbfe"
              emissive="#93c5fd"
              emissiveIntensity={0.4}
              transparent
              opacity={0.85}
            />
          </mesh>
        ))
      )}

      {/* Label */}
      <Text
        position={[0, height + 1, 0]}
        fontSize={0.45}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.04}
        outlineColor="#0f172a"
      >
        {building.label}
      </Text>

      {/* Occupancy badge */}
      {building.occupants > 0 && (
        <Html position={[width / 2 + 0.2, height, 0]} distanceFactor={10}>
          <div className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white shadow">
            {building.occupants}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  blue: '#3b82f6', purple: '#8b5cf6', green: '#10b981',
  orange: '#f59e0b', red: '#ef4444', teal: '#14b8a6',
};

function Avatar({ user, isLocal }: { user: CampusUser; isLocal?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current && isLocal) {
      groupRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.05;
    }
  });

  const color = AVATAR_COLORS[user.avatar.color] ?? '#3b82f6';

  return (
    <group ref={groupRef} position={user.position}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.85, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Name tag */}
      <Text
        position={[0, 2.4, 0]}
        fontSize={0.28}
        color={isLocal ? '#fbbf24' : 'white'}
        anchorX="center"
        outlineWidth={0.03}
        outlineColor="#0f172a"
      >
        {isLocal ? `★ ${user.avatar.name}` : user.avatar.name}
      </Text>
      {/* Speaking indicator */}
      {user.isSpeaking && (
        <mesh position={[0.35, 1.85, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1} />
        </mesh>
      )}
    </group>
  );
}

// ─── Tree ─────────────────────────────────────────────────────────────────────

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 2, 8]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.8, 0]} castShadow>
        <coneGeometry args={[1.2, 2.5, 8]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.8, 0]} castShadow>
        <coneGeometry args={[0.8, 1.8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
    </group>
  );
}

// ─── Lamp Post ────────────────────────────────────────────────────────────────

function LampPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 4, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 4.1, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1.5} />
      </mesh>
      <pointLight position={[0, 4.1, 0]} intensity={0.8} color="#fbbf24" distance={8} />
    </group>
  );
}

// ─── Ground & Campus Layout ───────────────────────────────────────────────────

const TREE_POSITIONS: [number, number, number][] = [
  [-7, 0, -4], [7, 0, -4], [-7, 0, 4], [7, 0, 4],
  [-14, 0, -14], [14, 0, -14], [-14, 0, 14], [14, 0, 14],
  [-20, 0, 0], [20, 0, 0], [0, 0, -22], [0, 0, 20],
];

const LAMP_POSITIONS: [number, number, number][] = [
  [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
  [-10, 0, 0], [10, 0, 0], [0, 0, -10], [0, 0, 10],
];

function CampusGround() {
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#1e3a2f" roughness={0.9} />
      </mesh>

      {/* Pathways */}
      {[
        { pos: [0, 0, 0] as [number, number, number], rot: [-Math.PI / 2, 0, 0] as [number, number, number], size: [2, 40] as [number, number] },
        { pos: [0, 0, 0] as [number, number, number], rot: [-Math.PI / 2, 0, Math.PI / 2] as [number, number, number], size: [2, 40] as [number, number] },
      ].map((p, i) => (
        <mesh key={i} rotation={p.rot} position={p.pos} receiveShadow>
          <planeGeometry args={p.size} />
          <meshStandardMaterial color="#374151" roughness={0.8} />
        </mesh>
      ))}

      {/* Central plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[5, 32]} />
        <meshStandardMaterial color="#4b5563" roughness={0.7} />
      </mesh>

      {/* Fountain basin */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[1.5, 1.8, 0.6, 32]} />
        <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Fountain water surface */}
      <mesh position={[0, 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.4, 32]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.6} roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Fountain spout */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.6} />
      </mesh>

      {/* Trees */}
      {TREE_POSITIONS.map((pos, i) => <Tree key={i} position={pos} />)}

      {/* Lamp posts */}
      {LAMP_POSITIONS.map((pos, i) => <LampPost key={i} position={pos} />)}
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export function CampusScene({
  buildings,
  users,
  localUser,
  onEnterBuilding,
}: {
  buildings: CampusBuilding[];
  users: CampusUser[];
  localUser: CampusUser | null;
  onEnterBuilding: (id: string) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 18, 28], fov: 55 }}
      style={{ background: '#0f172a' }}
    >
      <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={0.5} />
      <Stars radius={80} depth={50} count={3000} factor={3} fade />

      <ambientLight intensity={0.4} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#fbbf24" />

      <CampusGround />

      {buildings.map(b => (
        <Building key={b.id} building={b} onEnter={onEnterBuilding} />
      ))}

      {users.map(u => (
        <Avatar key={u.id} user={u} />
      ))}

      {localUser && <Avatar user={localUser} isLocal />}

      <OrbitControls
        enablePan
        enableZoom
        minDistance={8}
        maxDistance={60}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
