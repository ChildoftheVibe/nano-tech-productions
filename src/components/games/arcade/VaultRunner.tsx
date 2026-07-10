"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeEndActions, ArcadeStatus, HoldButton, PadButton } from "./ArcadeControls";
import { MuteToggle, PALETTE, useSfx } from "./retro64";

/**
 * Low-poly 3D endless-runner (chase cam): run right, clear gaps and spikes,
 * touch the portal flag to win. three.js / @react-three/fiber are imported
 * ONLY in this file (and StarVanguard.tsx) so the WebGL bundle is fetched
 * exclusively when one of those two games is opened.
 *
 * Gameplay is the EXACT original 2D simulation (same speeds, gravity, jump
 * impulse, level length, and gap/spike geometry as the Canvas2D version) —
 * only the render layer changed. 2D x → 3D x (direction of travel), 2D y
 * (vertical, gravity) → 3D y (up/down), single lane at 3D z = 0, with a
 * chase camera trailing the player.
 */

const W = 320;
const H = 260;
const GROUND = 210;
// Tuned easy: a shorter run with widely-spaced, smaller obstacles (see the
// level generator) so reaching the portal flag is the likely outcome.
const LEVEL_END = 1600;

type Rect = { x: number; w: number };
type Level = { gaps: Rect[]; spikes: Rect[]; groundSegments: Rect[] };

/** Random level layout — kept as a plain, unhooked function so it can be
 *  called from a useState lazy initializer (the sanctioned one-time-impure
 *  entry point) rather than during render proper. */
function generateLevel(): Level {
  const gaps: Rect[] = [];
  const spikes: Rect[] = [];
  let x = 380;
  while (x < LEVEL_END - 300) {
    if (Math.random() < 0.5) gaps.push({ x, w: 52 + Math.random() * 26 });
    else spikes.push({ x, w: 54 });
    x += 320 + Math.random() * 190;
  }
  const edges = [...gaps].sort((a, b) => a.x - b.x);
  const groundSegments: Rect[] = [];
  let gx = 0;
  for (const g of edges) {
    groundSegments.push({ x: gx, w: g.x - gx });
    gx = g.x + g.w;
  }
  groundSegments.push({ x: gx, w: LEVEL_END + 400 - gx });
  return { gaps, spikes, groundSegments };
}

// ---------------------------------------------------------------------------
// 2D playfield -> 3D world coordinate mapping (rendering only).
// ---------------------------------------------------------------------------
const SCALE = 40;
const worldX = (x: number) => x / SCALE;
const worldY = (y: number) => (GROUND - y) / SCALE;

type InputState = { left: boolean; right: boolean; jumpSeq: number };

type SceneProps = {
  input: React.RefObject<InputState>;
  level: Level;
  onEnd: (won: boolean) => void;
  onJump: () => void;
  onLand: () => void;
  onDie: () => void;
  paused: boolean;
  reducedMotion: boolean;
};

function Scene({ input, level, onEnd, onJump, onLand, onDie, paused, reducedMotion }: SceneProps) {
  const { camera } = useThree();
  const playerRef = useRef<THREE.Group>(null);
  const burstRef = useRef<THREE.InstancedMesh>(null);
  const dummyRef = useRef(new THREE.Object3D());
  const shakeState = useRef({ amp: 0, dur: 0, elapsed: 0 });
  const camShakeOffset = useRef(new THREE.Vector3());
  const lastJumpSeq = useRef(0);

  type Particle = { active: boolean; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; maxLife: number };
  const burstPoolRef = useRef<Particle[]>(
    Array.from({ length: 40 }, () => ({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 0.5 })),
  );
  const spawnBurst = useCallback((x: number, y: number, z: number, count: number, speed: number) => {
    let spawned = 0;
    for (const p of burstPoolRef.current) {
      if (spawned >= count) break;
      if (p.active) continue;
      p.active = true;
      p.x = x; p.y = y; p.z = z;
      p.vx = (Math.random() * 2 - 1) * speed;
      p.vy = Math.random() * speed;
      p.vz = (Math.random() * 2 - 1) * speed;
      p.life = p.maxLife = 0.3 + Math.random() * 0.3;
      spawned++;
    }
  }, []);
  const triggerShake = useCallback((amp: number, dur: number) => {
    const s = shakeState.current;
    if (amp >= s.amp || s.elapsed >= s.dur) {
      s.amp = amp; s.dur = dur; s.elapsed = 0;
    }
  }, []);

  const sim = useRef({
    px: 40, py: GROUND, vx: 0, vy: 0, grounded: true, wasGrounded: true, over: false,
  });

  const overGap = useCallback(
    (px: number) => level.gaps.some((g) => px > g.x && px < g.x + g.w),
    [level.gaps],
  );

  useFrame((_, dt) => {
    const s = sim.current;

    if (!s.over && !paused) {
      const accel = 0.5;
      if (input.current.right) s.vx = Math.min(3.4, s.vx + accel);
      else if (input.current.left) s.vx = Math.max(-2.4, s.vx - accel);
      else s.vx *= 0.85;
      // Edge-triggered jump: compare against the last jump sequence number we
      // consumed (owned locally by Scene) rather than writing back into the
      // shared input ref.
      if (input.current.jumpSeq !== lastJumpSeq.current && s.grounded) {
        lastJumpSeq.current = input.current.jumpSeq;
        s.vy = -9.9;
        s.grounded = false;
        onJump();
      } else {
        lastJumpSeq.current = input.current.jumpSeq;
      }

      s.px = Math.max(10, s.px + s.vx);
      s.vy += 0.5;
      s.py += s.vy;

      s.wasGrounded = s.grounded;
      if (s.py >= GROUND && !overGap(s.px)) {
        s.py = GROUND;
        s.vy = 0;
        s.grounded = true;
      } else {
        s.grounded = false;
      }
      if (s.grounded && !s.wasGrounded) {
        onLand();
        spawnBurst(worldX(s.px), 0.02, 0, 6, 1.6);
      }

      if (s.py > H + 30) {
        s.over = true;
        triggerShake(0.18, 0.35);
        onDie();
        onEnd(false);
      }
      if (
        s.py >= GROUND - 2 &&
        level.spikes.some((sp) => s.px > sp.x - 6 && s.px < sp.x + sp.w + 6)
      ) {
        s.over = true;
        spawnBurst(worldX(s.px), worldY(s.py) + 0.3, 0, 20, 4.2);
        triggerShake(0.16, 0.3);
        onDie();
        onEnd(false);
      }
      if (s.px >= LEVEL_END) {
        s.over = true;
        spawnBurst(worldX(s.px), worldY(s.py) + 0.6, 0, 24, 3.6);
        onEnd(true);
      }
    }

    // ---- Render ----
    const px3 = worldX(s.px);
    const py3 = worldY(s.py) + 0.28;
    if (playerRef.current) {
      playerRef.current.position.set(px3, py3, 0);
      const lean = Math.max(-0.35, Math.min(0.35, s.vx * 0.12));
      playerRef.current.rotation.z = -lean;
      const airTilt = s.grounded ? 0 : Math.max(-0.5, Math.min(0.5, -s.vy * 0.04));
      playerRef.current.rotation.x = airTilt;
    }

    // Particle pool. Indexed loop (not for..of) so every mutation is a direct
    // burstPoolRef.current[idx].field write the compiler can trace back to
    // the ref, matching the sim.current.field pattern above.
    const dummy = dummyRef.current;
    const pool = burstPoolRef.current;
    if (burstRef.current) {
      for (let idx = 0; idx < pool.length; idx++) {
        if (pool[idx].active) {
          pool[idx].life -= dt;
          pool[idx].vy -= 3.5 * dt;
          if (pool[idx].life <= 0) pool[idx].active = false;
          else {
            pool[idx].x += pool[idx].vx * dt;
            pool[idx].y += pool[idx].vy * dt;
            pool[idx].z += pool[idx].vz * dt;
          }
        }
        const scale = pool[idx].active ? Math.max(0, pool[idx].life / pool[idx].maxLife) * 0.1 : 0;
        dummy.position.set(pool[idx].x, pool[idx].y, pool[idx].z);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        burstRef.current.setMatrixAt(idx, dummy.matrix);
      }
      burstRef.current.instanceMatrix.needsUpdate = true;
    }

    // Chase camera: trail behind and above the player, looking ahead.
    const sh = shakeState.current;
    if (sh.elapsed < sh.dur) {
      sh.elapsed += dt;
      const t = Math.max(0, 1 - sh.elapsed / sh.dur);
      const mag = reducedMotion ? 0 : sh.amp * t;
      camShakeOffset.current.set((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag, 0);
    } else {
      camShakeOffset.current.set(0, 0, 0);
    }
    const camTarget = new THREE.Vector3(px3 - 3.2, py3 + 2.1, 4.4).add(camShakeOffset.current);
    camera.position.lerp(camTarget, reducedMotion ? 1 : Math.min(1, dt * 5));
    camera.lookAt(px3 + 4, py3 + 0.3, 0);
  });

  return (
    <>
      {/* Bright, flat lighting: three.js's physically-correct light units need
          much higher intensities than the pre-r155 default model. */}
      <ambientLight intensity={1.8} />
      <directionalLight position={[4, 6, 5]} intensity={3.5} color="#ffffff" />
      <fog attach="fog" args={[PALETTE.base, 8, 30]} />

      {/* Distant low-poly skyline for cheap parallax depth. */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} position={[i * 6 - 6, -0.6, -9 - (i % 3) * 2]}>
          <coneGeometry args={[1.4, 2.4 + (i % 3), 4]} />
          <meshStandardMaterial color={PALETTE.felt} flatShading emissive={PALETTE.teal} emissiveIntensity={0.15} />
        </mesh>
      ))}

      {/* Ground segments (gaps are literal missing geometry). */}
      {level.groundSegments.map((seg, i) => (
        <group key={i} position={[worldX(seg.x) + worldX(seg.w) / 2, -0.06, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[Math.max(0.01, worldX(seg.w)), 0.5, 2]} />
            <meshStandardMaterial color={PALETTE.felt} flatShading roughness={0.8} emissive={PALETTE.felt} emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[Math.max(0.01, worldX(seg.w)), 0.02, 2]} />
            <meshStandardMaterial color={PALETTE.teal} emissive={PALETTE.teal} emissiveIntensity={1.4} />
          </mesh>
        </group>
      ))}

      {/* Spikes. */}
      {level.spikes.map((sp, i) => (
        <mesh key={i} position={[worldX(sp.x + sp.w / 2), 0.06, 0]}>
          <coneGeometry args={[worldX(sp.w) / 1.6, 0.6, 4]} />
          <meshStandardMaterial color={PALETTE.coral} flatShading roughness={0.4} emissive={PALETTE.coral} emissiveIntensity={0.6} />
        </mesh>
      ))}

      {/* Portal flag at the finish line. */}
      <group position={[worldX(LEVEL_END), 0.2, 0]}>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.5, 6]} />
          <meshStandardMaterial color={PALETTE.pink} flatShading emissive={PALETTE.pink} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, 1.55, 0]}>
          <icosahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={PALETTE.pink} flatShading emissive={PALETTE.pink} emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Player: chunky low-poly runner. */}
      <group ref={playerRef}>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[0.32, 0.4, 0.28]} />
          <meshStandardMaterial color={PALETTE.teal} flatShading roughness={0.5} emissive={PALETTE.teal} emissiveIntensity={0.9} />
        </mesh>
        <mesh position={[0, 0.42, 0.02]}>
          <boxGeometry args={[0.22, 0.22, 0.24]} />
          <meshStandardMaterial color={PALETTE.gold} flatShading roughness={0.5} emissive={PALETTE.gold} emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Landing dust / spike-hit / finish burst pool. */}
      <instancedMesh ref={burstRef} args={[undefined, undefined, 40]}>
        <octahedronGeometry args={[0.1, 0]} />
        <meshBasicMaterial color={PALETTE.gold} />
      </instancedMesh>
    </>
  );
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function VaultRunner({ onFinish, onPlayAgain, onReturn }: ArcadeProps) {
  const [status, setStatus] = useState<"live" | "won" | "lost">("live");
  const finishedRef = useRef(false);
  const input = useRef<InputState>({ left: false, right: false, jumpSeq: 0 });
  const sfx = useSfx();
  const [level] = useState<Level>(() => generateLevel());
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

  const requestJump = useCallback(() => {
    input.current.jumpSeq++;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.key === "ArrowLeft") { input.current.left = down; e.preventDefault(); }
      if (e.key === "ArrowRight") { input.current.right = down; e.preventDefault(); }
      if ((e.key === "ArrowUp" || e.key === " ") && down) { requestJump(); e.preventDefault(); }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [requestJump]);

  return (
    <div className="flex flex-col items-center gap-3">
      <ArcadeStatus>Reach the portal flag. Dodge gaps and spikes.</ArcadeStatus>
      <div
        className="w-full max-w-[320px] overflow-hidden rounded-lg border border-[rgba(255,255,255,0.1)]"
        style={{ aspectRatio: `${W} / ${H}`, background: PALETTE.base }}
        role="img"
        aria-label="Vault Runner stage"
      >
        <Canvas
          dpr={1}
          flat
          gl={{ antialias: false, alpha: false }}
          camera={{ position: [-2, 2.5, 5], fov: 58 }}
          frameloop={status === "live" ? "always" : "never"}
        >
          <color attach="background" args={[PALETTE.base]} />
          <Suspense fallback={null}>
            <Scene
              input={input}
              level={level}
              onEnd={end}
              onJump={() => sfx.play("jump")}
              onLand={() => sfx.play("land")}
              onDie={() => sfx.play("explode")}
              paused={status !== "live"}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </Canvas>
      </div>
      {status === "live" ? (
        <div className="flex gap-2" role="group" aria-label="Touch controls">
          <HoldButton label="Move left" onHoldChange={(h) => (input.current.left = h)}>◀</HoldButton>
          <PadButton label="Jump" onPress={requestJump}>⤒</PadButton>
          <HoldButton label="Move right" onHoldChange={(h) => (input.current.right = h)}>▶</HoldButton>
          <MuteToggle />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <ArcadeStatus tone={status === "won" ? "win" : "lose"}>
            {status === "won" ? "Stage complete!" : "Wiped out."}
          </ArcadeStatus>
          {onPlayAgain && onReturn && <ArcadeEndActions onPlayAgain={onPlayAgain} onReturn={onReturn} />}
        </div>
      )}
    </div>
  );
}
