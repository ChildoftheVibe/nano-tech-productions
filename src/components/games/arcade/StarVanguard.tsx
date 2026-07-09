"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeStatus, HoldButton, PadButton } from "./ArcadeControls";
import { MuteToggle, PALETTE, useSfx } from "./retro64";

/**
 * Low-poly 3D rail shooter (Star Fox spirit): destroy the whole alien
 * formation before it reaches you. three.js / @react-three/fiber are
 * imported ONLY in this file (and VaultRunner.tsx) so the WebGL bundle is
 * fetched exclusively when one of those two games is opened.
 *
 * The gameplay is the EXACT original 2D simulation (same field size,
 * speeds, fire rates, and collision thresholds as the Canvas2D version) —
 * only the render layer changed. A fixed linear mapping turns the original
 * 320×400 2D playfield into 3D world space: 2D x → 3D x (side to side), 2D y
 * → 3D z (depth from camera), so aliens visually approach the player as
 * their 2D y increases, exactly mirroring the original "formation steps
 * down toward you" rule.
 */

const W = 320;
const H = 400;

type Alien = { x: number; y: number; alive: boolean };
type Shot = { x: number; y: number; vy: number };

// ---------------------------------------------------------------------------
// 2D playfield -> 3D world coordinate mapping (rendering only, no gameplay
// numbers below this point are altered from the original simulation).
// ---------------------------------------------------------------------------
const SCALE = 40;
const Z_FAR = -14;
const Z_NEAR = 4;
const worldX = (x: number) => (x - W / 2) / SCALE;
const worldZ = (y: number) => Z_FAR + (y / H) * (Z_NEAR - Z_FAR);
const PLAYER_Y = -1.2;
const ALIEN_Y = 0.9;

const PLAYER_SHOT_POOL = 12;
const ENEMY_SHOT_POOL = 6;
const ALIEN_COUNT = 10;

type Sim = {
  aliens: Alien[];
  px: number;
  shots: Shot[];
  enemyShots: Shot[];
  dir: number;
  speed: number;
  lastEnemyFire: number;
  over: boolean;
  lastShot: number;
};

function createSim(): Sim {
  const aliens: Alien[] = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 5; c++) {
      aliens.push({ x: 60 + c * 48, y: 44 + r * 34, alive: true });
    }
  }
  return {
    aliens,
    px: W / 2,
    shots: [],
    enemyShots: [],
    dir: 1,
    speed: 0.28,
    lastEnemyFire: 0,
    over: false,
    lastShot: 0,
  };
}

type SceneProps = {
  input: React.RefObject<{ left: boolean; right: boolean }>;
  fireRef: React.RefObject<() => void>;
  onEnd: (won: boolean) => void;
  onShoot: () => void;
  onHit: () => void;
  onExplode: () => void;
  paused: boolean;
  reducedMotion: boolean;
};

/** All the R3F hooks (useFrame/useThree) must live inside a <Canvas> child. */
function Scene({ input, fireRef, onEnd, onShoot, onHit, onExplode, paused, reducedMotion }: SceneProps) {
  const { camera } = useThree();
  const baseCameraPos = useMemo(() => new THREE.Vector3(0, 0.4, 9.5), []);

  const playerRef = useRef<THREE.Group>(null);
  const alienRefs = useRef<(THREE.Group | null)[]>([]);
  const shotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const enemyShotRefs = useRef<(THREE.Mesh | null)[]>([]);
  const starsRef = useRef<THREE.Points>(null);
  const burstRef = useRef<THREE.InstancedMesh>(null);

  const dummyRef = useRef(new THREE.Object3D());
  const shakeState = useRef({ amp: 0, dur: 0, elapsed: 0 });

  type Particle = { active: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number };
  const burstPoolRef = useRef<Particle[]>(
    Array.from({ length: 48 }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5 })),
  );
  const spawnBurst = useCallback((x: number, y: number, z: number, count: number, speed: number) => {
    let spawned = 0;
    const pool = burstPoolRef.current;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      if (pool[i].active) continue;
      pool[i].active = true;
      pool[i].x = x; pool[i].y = y; pool[i].z = z;
      pool[i].vx = (Math.random() * 2 - 1) * speed;
      pool[i].vy = (Math.random() * 2 - 1) * speed;
      pool[i].vz = (Math.random() * 2 - 1) * speed;
      pool[i].life = pool[i].maxLife = 0.35 + Math.random() * 0.25;
      spawned++;
    }
  }, []);
  const triggerShake = useCallback((amp: number, dur: number) => {
    const s = shakeState.current;
    if (amp >= s.amp || s.elapsed >= s.dur) {
      s.amp = amp; s.dur = dur; s.elapsed = 0;
    }
  }, []);

  // Simulation state — identical shape/values to the original Canvas2D
  // implementation. Lazily created on the first frame callback (not during
  // render) since it involves randomized alien layout bookkeeping, then held
  // in a ref so per-frame mutation never triggers React re-renders.
  const simRef = useRef<Sim | null>(null);
  const ensureSim = useCallback((): Sim => {
    if (!simRef.current) simRef.current = createSim();
    return simRef.current;
  }, []);

  useEffect(() => {
    fireRef.current = () => {
      const s = ensureSim();
      const now = performance.now();
      if (s.over || now - s.lastShot < 200) return;
      s.lastShot = now;
      s.shots.push({ x: s.px, y: H - 34, vy: -7 });
      onShoot();
    };
  }, [fireRef, onShoot, ensureSim]);

  useFrame((_, dt) => {
    const s = ensureSim();
    const elapsedMs = performance.now();

    if (!s.over && !paused) {
      // Player movement.
      if (input.current.left) s.px = Math.max(14, s.px - 3.2);
      if (input.current.right) s.px = Math.min(W - 14, s.px + 3.2);

      // Formation movement.
      const alive = s.aliens.filter((a) => a.alive);
      const xs = alive.map((a) => a.x);
      if (xs.length && Math.max(...xs) > W - 20 && s.dir > 0) {
        s.dir = -1;
        alive.forEach((a) => (a.y += 12));
      } else if (xs.length && Math.min(...xs) < 20 && s.dir < 0) {
        s.dir = 1;
        alive.forEach((a) => (a.y += 12));
      }
      const speed = s.speed + (1 - alive.length / s.aliens.length) * 0.6;
      alive.forEach((a) => (a.x += s.dir * speed));

      // Enemy fire.
      if (alive.length && elapsedMs - s.lastEnemyFire > 1500) {
        s.lastEnemyFire = elapsedMs;
        const shooter = alive[Math.floor(Math.random() * alive.length)];
        s.enemyShots.push({ x: shooter.x, y: shooter.y + 10, vy: 3 });
      }

      // Shots.
      s.shots.forEach((sh) => (sh.y += sh.vy));
      s.enemyShots.forEach((sh) => (sh.y += sh.vy));
      s.shots = s.shots.filter((sh) => sh.y > -10);
      s.enemyShots = s.enemyShots.filter((sh) => sh.y < H + 10);

      // Collisions.
      for (const sh of s.shots) {
        const hit = alive.find(
          (a) => a.alive && Math.abs(a.x - sh.x) < 14 && Math.abs(a.y - sh.y) < 12,
        );
        if (hit) {
          hit.alive = false;
          sh.y = -100;
          spawnBurst(worldX(hit.x), ALIEN_Y, worldZ(hit.y), 14, 4.5);
          triggerShake(0.06, 0.15);
          onHit();
        }
      }
      if (
        s.enemyShots.some((sh) => Math.abs(sh.x - s.px) < 12 && sh.y > H - 40 && sh.y < H - 16) ||
        alive.some((a) => a.y > H - 60)
      ) {
        s.over = true;
        spawnBurst(worldX(s.px), PLAYER_Y, worldZ(H - 30), 26, 5.5);
        triggerShake(0.22, 0.4);
        onExplode();
        onEnd(false);
      }
      if (s.aliens.every((a) => !a.alive)) {
        s.over = true;
        onEnd(true);
      }
    }

    // ---- Render: write simulation state into 3D object transforms. ----
    if (playerRef.current) {
      playerRef.current.position.set(worldX(s.px), PLAYER_Y, worldZ(H - 30));
    }
    for (let i = 0; i < s.aliens.length; i++) {
      const ref = alienRefs.current[i];
      if (!ref) continue;
      const a = s.aliens[i];
      ref.visible = a.alive;
      if (a.alive) ref.position.set(worldX(a.x), ALIEN_Y, worldZ(a.y));
    }
    for (let i = 0; i < PLAYER_SHOT_POOL; i++) {
      const mesh = shotRefs.current[i];
      if (!mesh) continue;
      const sh = s.shots[i];
      mesh.visible = !!sh;
      if (sh) mesh.position.set(worldX(sh.x), PLAYER_Y + 0.15, worldZ(sh.y));
    }
    for (let i = 0; i < ENEMY_SHOT_POOL; i++) {
      const mesh = enemyShotRefs.current[i];
      if (!mesh) continue;
      const sh = s.enemyShots[i];
      mesh.visible = !!sh;
      if (sh) mesh.position.set(worldX(sh.x), ALIEN_Y - 0.15, worldZ(sh.y));
    }

    // Explosion particle pool. Indexed loop so every mutation is a direct
    // burstPoolRef.current[i].field write the compiler can trace to the ref.
    const dummy = dummyRef.current;
    const pool = burstPoolRef.current;
    if (burstRef.current) {
      for (let i = 0; i < pool.length; i++) {
        if (pool[i].active) {
          pool[i].life -= dt;
          if (pool[i].life <= 0) pool[i].active = false;
          else {
            pool[i].x += pool[i].vx * dt;
            pool[i].y += pool[i].vy * dt;
            pool[i].z += pool[i].vz * dt;
          }
        }
        const scale = pool[i].active ? Math.max(0, pool[i].life / pool[i].maxLife) * 0.14 : 0;
        dummy.position.set(pool[i].x, pool[i].y, pool[i].z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        burstRef.current.setMatrixAt(i, dummy.matrix);
      }
      burstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Starfield tunnel drift (decorative only — skipped under reduced motion).
    if (starsRef.current && !reducedMotion) {
      starsRef.current.rotation.z += dt * 0.02;
      const posAttr = starsRef.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < posAttr.count; i++) {
        let z = posAttr.getZ(i) + dt * 3.2;
        if (z > Z_NEAR + 2) z = Z_FAR - 2;
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;
    }

    // Camera micro-shake.
    const sh = shakeState.current;
    if (sh.elapsed < sh.dur) {
      sh.elapsed += dt;
      const t = Math.max(0, 1 - sh.elapsed / sh.dur);
      const mag = sh.amp * t;
      camera.position.set(
        baseCameraPos.x + (Math.random() * 2 - 1) * mag,
        baseCameraPos.y + (Math.random() * 2 - 1) * mag,
        baseCameraPos.z,
      );
    } else {
      camera.position.copy(baseCameraPos);
    }
    camera.lookAt(0, -0.3, Z_FAR * 0.3);
  });

  // useState's lazy initializer (not useMemo) is the sanctioned one-time-impure
  // entry point — it runs once on mount, not on every render.
  const [starPositions] = useState(() => {
    const count = 90;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = Z_FAR + Math.random() * (Z_NEAR - Z_FAR + 4);
    }
    return arr;
  });

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} color="#ffffff" />
      <pointLight position={[0, 0, Z_NEAR + 1]} intensity={0.4} color={PALETTE.teal} />

      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#ffffff" transparent opacity={0.75} sizeAttenuation />
      </points>

      {/* Player ship: low-poly wedge. */}
      <group ref={playerRef}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI]} castShadow>
          <coneGeometry args={[0.32, 0.7, 4]} />
          <meshStandardMaterial color={PALETTE.teal} flatShading roughness={0.5} emissive={PALETTE.teal} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.05, 0.15]}>
          <boxGeometry args={[0.9, 0.06, 0.35]} />
          <meshStandardMaterial color={PALETTE.gold} flatShading roughness={0.6} />
        </mesh>
      </group>

      {/* Alien fighters: chunky faceted octahedra. */}
      {Array.from({ length: ALIEN_COUNT }, (_, i) => (
        <group key={i} ref={(el) => { alienRefs.current[i] = el; }}>
          <mesh scale={[1, 0.55, 1.3]} rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={PALETTE.pink} flatShading roughness={0.45} emissive={PALETTE.pink} emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Player shot pool. */}
      {Array.from({ length: PLAYER_SHOT_POOL }, (_, i) => (
        <mesh key={i} ref={(el) => { shotRefs.current[i] = el; }} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 5]} />
          <meshBasicMaterial color={PALETTE.teal} />
        </mesh>
      ))}
      {/* Enemy shot pool. */}
      {Array.from({ length: ENEMY_SHOT_POOL }, (_, i) => (
        <mesh key={i} ref={(el) => { enemyShotRefs.current[i] = el; }} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 5]} />
          <meshBasicMaterial color={PALETTE.coral} />
        </mesh>
      ))}

      {/* Shared explosion particle pool. */}
      <instancedMesh ref={burstRef} args={[undefined, undefined, 48]}>
        <tetrahedronGeometry args={[0.12, 0]} />
        <meshBasicMaterial color={PALETTE.gold} />
      </instancedMesh>
    </>
  );
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function StarVanguard({ onFinish }: ArcadeProps) {
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);
  const input = useRef({ left: false, right: false });
  const fireRef = useRef<() => void>(() => {});
  const sfx = useSfx();
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const end = useCallback(
    (won: boolean) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setStatus(won ? "won" : "lost");
      sfx.play(won ? "win" : "lose");
      onFinish(won);
    },
    [onFinish, sfx],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft") { input.current.left = down; e.preventDefault(); }
      if (e.key === "ArrowRight") { input.current.right = down; e.preventDefault(); }
      if (e.key === " " && down) { fireRef.current(); e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3">
      <ArcadeStatus>Destroy the formation before it lands.</ArcadeStatus>
      <div
        className="w-full max-w-[320px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)]"
        style={{ aspectRatio: `${W} / ${H}`, background: PALETTE.base }}
        role="img"
        aria-label="Star Vanguard playfield"
      >
        <Canvas
          dpr={1}
          gl={{ antialias: false, alpha: false }}
          camera={{ position: [0, 0.4, 9.5], fov: 55 }}
          frameloop={status === "live" ? "always" : "never"}
        >
          <color attach="background" args={[PALETTE.base]} />
          <Suspense fallback={null}>
            <Scene
              input={input}
              fireRef={fireRef}
              onEnd={end}
              onShoot={() => sfx.play("shoot")}
              onHit={() => sfx.play("hit")}
              onExplode={() => sfx.play("explode")}
              paused={status !== "live"}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>
      </div>
      {status === "live" ? (
        <div className="flex gap-2" role="group" aria-label="Touch controls">
          <HoldButton label="Move left" onHoldChange={(h) => (input.current.left = h)}>◀</HoldButton>
          <PadButton label="Fire" onPress={() => fireRef.current()}>✦</PadButton>
          <HoldButton label="Move right" onHoldChange={(h) => (input.current.right = h)}>▶</HoldButton>
          <MuteToggle />
        </div>
      ) : (
        <ArcadeStatus tone={status === "won" ? "win" : "lose"}>
          {status === "won" ? "Wave cleared!" : "Ship down."}
        </ArcadeStatus>
      )}
    </div>
  );
}
