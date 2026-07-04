"use client";

import { Suspense, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { AlbumPortal } from "./AlbumPortal";
import type { PortalAlbum } from "@/lib/portalData";

export const PORTAL_SPACING = 9;

type SceneProps = {
  albums: PortalAlbum[];
  index: number;
  flying: boolean;
  reducedMotion: boolean;
};

/** Camera rig: glides between portals on index change, pushes into the active
 *  portal during fly-through, and applies subtle pointer parallax at idle. */
function Rig({ index, flying, reducedMotion }: Omit<SceneProps, "albums">) {
  useFrame((state, delta) => {
    const cam = state.camera;
    const targetX = index * PORTAL_SPACING;
    const glide = reducedMotion ? 1 : Math.min(1, delta * 4);
    cam.position.x += (targetX - cam.position.x) * glide;

    const targetZ = flying && !reducedMotion ? 0.35 : 6;
    const zoom = flying ? Math.min(1, delta * 3.2) : glide;
    cam.position.z += (targetZ - cam.position.z) * zoom;

    if (!reducedMotion && !flying) {
      cam.position.y += (state.pointer.y * 0.22 - cam.position.y) * Math.min(1, delta * 2);
    }
    cam.lookAt(targetX, 0, 0);
  });
  return null;
}

export default function PortalScene({ albums, index, flying, reducedMotion }: SceneProps) {
  // PerformanceMonitor flips this when frame rate drops: fewer particles,
  // dpr 1, no MSAA — degrade quality instead of stuttering.
  const [degraded, setDegraded] = useState(false);

  return (
    <Canvas
      dpr={degraded ? 1 : [1, 2]}
      gl={{ antialias: !degraded, powerPreference: "high-performance", alpha: false }}
      camera={{ fov: 55, position: [0, 0, 6] }}
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={["#05090a"]} />
      <fog attach="fog" args={["#05090a", 7, 16]} />
      <PerformanceMonitor onDecline={() => setDegraded(true)} />
      <Rig index={index} flying={flying} reducedMotion={reducedMotion} />
      {albums.map((album, i) =>
        // Lazy-load: only the active portal and its neighbors are mounted, so
        // off-screen textures are never fetched.
        Math.abs(i - index) <= 1 ? (
          <Suspense key={album.id} fallback={null}>
            <AlbumPortal
              album={album}
              position={[i * PORTAL_SPACING, 0, 0]}
              active={i === index}
              reducedMotion={reducedMotion}
              particleCount={degraded ? 120 : 360}
            />
          </Suspense>
        ) : null,
      )}
    </Canvas>
  );
}
