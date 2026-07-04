"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { PortalAlbum } from "@/lib/portalData";

type AlbumPortalProps = {
  album: PortalAlbum;
  position: [number, number, number];
  active: boolean;
  reducedMotion: boolean;
  particleCount: number;
};

/** One full-screen album gateway: cover art inside a circular plane, an
 *  emissive accent ring with idle shimmer, and a drifting particle field in
 *  the album's color. All motion is skipped under prefers-reduced-motion. */
/** Deterministic PRNG (mulberry32) so particle layouts are pure per render
 *  and stable for a given album. */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function AlbumPortal({
  album,
  position,
  active,
  reducedMotion,
  particleCount,
}: AlbumPortalProps) {
  const texture = useTexture(album.coverUrl, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
  });

  const group = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const points = useRef<THREE.Points>(null);
  const accent = useMemo(() => new THREE.Color(album.accentColor), [album.accentColor]);

  const particlePositions = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < album.id.length; i += 1) seed = (seed * 31 + album.id.charCodeAt(i)) | 0;
    const rand = seededRandom(seed);
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = rand() * Math.PI * 2;
      const radius = 2.3 + (rand() - 0.5) * 1.8;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = Math.sin(angle) * radius;
      arr[i * 3 + 2] = (rand() - 0.5) * 1.6;
    }
    return arr;
  }, [particleCount, album.id]);

  useFrame((state) => {
    if (reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (ringMat.current) ringMat.current.opacity = 0.72 + Math.sin(t * 1.6) * 0.18;
    if (points.current) points.current.rotation.z = t * 0.05;
    if (group.current) group.current.position.y = position[1] + Math.sin(t * 0.5) * 0.06;
  });

  return (
    <group ref={group} position={position} scale={active ? 1 : 0.88}>
      <mesh>
        <circleGeometry args={[1.92, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[2.06, 0.05, 16, 128]} />
        <meshBasicMaterial
          ref={ringMat}
          color={accent}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.12}>
        <torusGeometry args={[2.06, 0.014, 8, 128]} />
        <meshBasicMaterial color={accent} transparent opacity={0.3} toneMapped={false} />
      </mesh>
      <points ref={points} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={accent}
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
