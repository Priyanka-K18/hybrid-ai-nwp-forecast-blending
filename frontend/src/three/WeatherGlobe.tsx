import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

// Convert lat/long to 3D Cartesian coordinates on sphere of radius R
function latLongToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

interface GlobeProps {
  activeRegionId: string;
  onSelectRegion: (regionId: string) => void;
  regions: Array<{ id: string; name: string; lat: number; lon: number }>;
}

const REGION_PINS = [
  { id: 'karnataka', name: 'Karnataka', lat: 15.3173, lon: 75.7139, color: '#38bdf8' },
  { id: 'kerala', name: 'Kerala', lat: 10.8505, lon: 76.2711, color: '#10b981' },
  { id: 'maharashtra', name: 'Maharashtra', lat: 19.7515, lon: 75.7139, color: '#6366f1' },
  { id: 'tamil_nadu', name: 'Tamil Nadu', lat: 11.1271, lon: 78.6569, color: '#38bdf8' },
  { id: 'rajasthan', name: 'Rajasthan', lat: 27.0238, lon: 74.2179, color: '#f59e0b' },
  { id: 'delhi', name: 'Delhi', lat: 28.7041, lon: 77.1025, color: '#f43f5e' },
  { id: 'assam', name: 'Assam', lat: 26.2006, lon: 92.9376, color: '#10b981' },
  { id: 'odisha', name: 'Odisha', lat: 20.9517, lon: 85.9836, color: '#06b6d4' },
];

function EarthSphere({ activeRegionId, onSelectRegion }: { activeRegionId: string; onSelectRegion: (id: string) => void }) {
  const globeRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);

  // Slow auto-rotation with gentle damping
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.04;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.06;
    }
  });

  // Procedural dark ocean and land gradient texture for Earth surface
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Deep navy ocean
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#040814');
      grad.addColorStop(0.5, '#0b1938');
      grad.addColorStop(1, '#040814');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Latitudinal grid lines & synoptic contours
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      for (let y = 32; y < 512; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }
      for (let x = 64; x < 1024; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }

      // India subcontinent coordinate patch approximation (approx lon 68-97 -> x 705-788, lat 8-37 -> y 150-230)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
      ctx.beginPath();
      ctx.ellipse(730, 200, 48, 65, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric cloud swirls
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 35; i++) {
        const cx = (i * 37) % 1024;
        const cy = (i * 29) % 512;
        ctx.beginPath();
        ctx.arc(cx, cy, 35 + (i % 20), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group ref={globeRef}>
      {/* Core Earth Sphere */}
      <mesh>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.65}
          metalness={0.2}
          emissive={new THREE.Color('#020617')}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Atmospheric Glow Outer Shell */}
      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Rotating High-Altitude Cloud Layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.04, 48, 48]} />
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={0.09}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Interactive Region Pins on India */}
      {REGION_PINS.map((pin) => {
        const pos = latLongToVector3(pin.lat, pin.lon, 2.03);
        const isActive = activeRegionId === pin.id;
        const isHovered = hoveredPin === pin.id;

        return (
          <group key={pin.id} position={pos}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectRegion(pin.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredPin(pin.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredPin(null);
              }}
            >
              <sphereGeometry args={[isActive ? 0.07 : isHovered ? 0.06 : 0.045, 16, 16]} />
              <meshBasicMaterial color={isActive ? '#38bdf8' : isHovered ? '#67e8f9' : pin.color} />
            </mesh>

            {/* Glowing Pulsing Ring for Active Region */}
            {isActive && (
              <mesh>
                <ringGeometry args={[0.07, 0.12, 24]} />
                <meshBasicMaterial
                  color="#38bdf8"
                  side={THREE.DoubleSide}
                  transparent
                  opacity={0.7}
                />
              </mesh>
            )}

            {/* Label Tooltip on Hover or Active */}
            {(isHovered || isActive) && (
              <Html distanceFactor={8} position={[0, 0.15, 0]}>
                <div className="pointer-events-none px-2 py-1 rounded bg-slate-900/90 text-[11px] font-mono text-cyan-300 border border-cyan-500/40 shadow-lg whitespace-nowrap">
                  {pin.name} {isActive ? '• Active' : ''}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

export const WeatherGlobe: React.FC<GlobeProps> = ({ activeRegionId, onSelectRegion }) => {
  return (
    <div className="relative w-full h-[380px] lg:h-[440px] rounded-2xl overflow-hidden glass-panel border border-cyan-500/20">
      {/* Overlay Badge */}
      <div className="absolute top-3 left-4 z-10 flex items-center space-x-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
        </span>
        <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">
          3D Weather Globe • India Region Focus
        </span>
      </div>

      <div className="absolute bottom-3 left-4 z-10 text-[11px] text-slate-400">
        Drag to rotate • Scroll to zoom • Click pin to focus region
      </div>

      <Canvas
        camera={{ position: [0, 1.2, 4.2], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 3, 5]} intensity={1.8} color="#e0f2fe" />
        <pointLight position={[-5, -3, -5]} intensity={0.4} color="#38bdf8" />
        <EarthSphere activeRegionId={activeRegionId} onSelectRegion={onSelectRegion} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          minDistance={2.6}
          maxDistance={6.5}
          rotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
};
