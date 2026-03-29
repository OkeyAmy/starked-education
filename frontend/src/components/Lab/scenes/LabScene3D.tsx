'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { LabChemical, LabMeasurementPoint, LabPPE } from '../../../types/lab';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function phToColor(ph: number) {
  const t = clamp((ph - 1) / 13, 0, 1);
  const acidic = new THREE.Color('#ef4444');
  const neutral = new THREE.Color('#22c55e');
  const basic = new THREE.Color('#3b82f6');

  if (t < 0.5) {
    return acidic.clone().lerp(neutral, t / 0.5);
  }
  return neutral.clone().lerp(basic, (t - 0.5) / 0.5);
}

function Equipment({
  id,
  position,
  label,
  color,
  onClick
}: {
  id: string;
  position: [number, number, number];
  label: string;
  color: string;
  onClick: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <group position={position}>
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onClick(id)}
        castShadow
      >
        <boxGeometry args={[1.4, 0.45, 1.1]} />
        <meshStandardMaterial color={hovered ? '#0ea5e9' : color} roughness={0.45} metalness={0.18} />
      </mesh>
      <Html distanceFactor={12} position={[0, 0.6, 0]}>
        <div className="rounded-xl bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white shadow ring-1 ring-white/10">
          {label}
        </div>
      </Html>
    </group>
  );
}

function LabBench({
  chemicals,
  measurement,
  ppe,
  isStirring,
  onToggleEquipment,
  onAddChemical,
  canAddChemicals
}: {
  chemicals: Record<LabChemical, number>;
  measurement: LabMeasurementPoint;
  ppe: LabPPE;
  isStirring: boolean;
  onToggleEquipment: (id: string) => void;
  onAddChemical: (chemical: LabChemical) => void;
  canAddChemicals: boolean;
}) {
  const liquidRef = useRef<THREE.Mesh>(null);

  const liquidColor = useMemo(() => {
    if (chemicals.indicator <= 0) {
      return new THREE.Color('#93c5fd');
    }
    return phToColor(measurement.ph);
  }, [chemicals.indicator, measurement.ph]);

  const fillHeight = useMemo(() => {
    const total = chemicals.acid + chemicals.base;
    return clamp(0.25 + total / 200, 0.25, 0.85);
  }, [chemicals.acid, chemicals.base]);

  useFrame(({ clock }) => {
    if (liquidRef.current) {
      const wobble = isStirring ? Math.sin(clock.elapsedTime * 8) * 0.02 : Math.sin(clock.elapsedTime * 2) * 0.006;
      liquidRef.current.position.y = 0.3 + fillHeight * 0.35 + wobble;
      (liquidRef.current.material as THREE.MeshStandardMaterial).color.lerp(liquidColor, 0.15);
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[18, 12]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.85} />
      </mesh>

      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 0.4, 5]} />
        <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.1} />
      </mesh>

      <group position={[0, 0.65, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.75, 0.85, 1.6, 32]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.22} metalness={0.05} transparent opacity={0.55} />
        </mesh>

        <mesh ref={liquidRef} position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.68, 0.78, 1.2, 32]} />
          <meshStandardMaterial color={liquidColor} roughness={0.32} metalness={0.08} transparent opacity={0.72} />
        </mesh>

        <mesh position={[0, 0.85, 0]}>
          <torusGeometry args={[0.78, 0.05, 14, 60]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.3} />
        </mesh>
      </group>

      <Equipment id="goggles" position={[-4.2, 0.8, -1.4]} label={`Goggles: ${ppe.goggles ? 'On' : 'Off'}`} color="#94a3b8" onClick={onToggleEquipment} />
      <Equipment id="gloves" position={[-4.2, 0.8, 0.2]} label={`Gloves: ${ppe.gloves ? 'On' : 'Off'}`} color="#94a3b8" onClick={onToggleEquipment} />
      <Equipment id="labCoat" position={[-4.2, 0.8, 1.8]} label={`Lab coat: ${ppe.labCoat ? 'On' : 'Off'}`} color="#94a3b8" onClick={onToggleEquipment} />
      <Equipment id="fumeHood" position={[4.3, 0.8, -1.4]} label={`Fume hood: ${ppe.fumeHood ? 'On' : 'Off'}`} color="#94a3b8" onClick={onToggleEquipment} />
      <Equipment id="stir" position={[4.3, 0.8, 0.2]} label={isStirring ? 'Stirring' : 'Stir'} color="#0ea5e9" onClick={onToggleEquipment} />

      <Equipment
        id="acid"
        position={[-1.7, 0.8, -1.9]}
        label={canAddChemicals ? `Add acid (${chemicals.acid}ml)` : 'Add acid (PPE required)'}
        color="#ef4444"
        onClick={() => onAddChemical('acid')}
      />
      <Equipment
        id="base"
        position={[1.7, 0.8, -1.9]}
        label={canAddChemicals ? `Add base (${chemicals.base}ml)` : 'Add base (PPE required)'}
        color="#3b82f6"
        onClick={() => onAddChemical('base')}
      />
      <Equipment
        id="indicator"
        position={[0, 0.8, 2.0]}
        label={`Indicator (${chemicals.indicator ? 'Added' : 'Missing'})`}
        color="#22c55e"
        onClick={() => onAddChemical('indicator')}
      />
    </group>
  );
}

export function LabScene3D({
  chemicals,
  measurement,
  ppe,
  isStirring,
  onToggleEquipment,
  onAddChemical,
  canAddChemicals
}: {
  chemicals: Record<LabChemical, number>;
  measurement: LabMeasurementPoint;
  ppe: LabPPE;
  isStirring: boolean;
  onToggleEquipment: (id: string) => void;
  onAddChemical: (chemical: LabChemical) => void;
  canAddChemicals: boolean;
}) {
  return (
    <Canvas shadows camera={{ position: [0, 6.5, 9.8], fov: 55 }} style={{ background: '#f8fafc' }}>
      <Sky sunPosition={[10, 18, 8]} turbidity={8} rayleigh={0.6} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 6]} intensity={1.05} castShadow shadow-mapSize={[2048, 2048]} />
      <pointLight position={[-6, 5, -4]} intensity={0.45} color="#38bdf8" />

      <LabBench
        chemicals={chemicals}
        measurement={measurement}
        ppe={ppe}
        isStirring={isStirring}
        onToggleEquipment={onToggleEquipment}
        onAddChemical={onAddChemical}
        canAddChemicals={canAddChemicals}
      />

      <OrbitControls enablePan enableZoom minDistance={6} maxDistance={16} maxPolarAngle={Math.PI / 2.02} target={[0, 0.4, 0]} />
    </Canvas>
  );
}
