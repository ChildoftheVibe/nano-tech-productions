import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import type { ArcadeProps } from "./Minesweeper";
import { ArcadeSkeleton } from "./ArcadeSkeleton";

export type { ArcadeProps };

/** Client-side registry matching ARCADE_GAMES ids in src/lib/nanoBucks.ts.
 *
 *  Every `Component` is lazy-loaded via next/dynamic so the hub/portal-gate
 *  bundle stays small — each game's code (and, for Star Vanguard / Vault
 *  Runner, the three.js/@react-three/fiber chunk) downloads only once that
 *  specific game is actually opened. `name`/`instructions` stay plain,
 *  synchronous strings because PortalGameGate and GamesHubClient read them
 *  before the game component itself mounts. */
export const ARCADE_COMPONENTS: Record<
  string,
  { name: string; instructions: string; Component: ComponentType<ArcadeProps> }
> = {
  checkers: {
    name: "Checkers",
    instructions: "Capture every AI piece. Tap a teal piece, then a highlighted square.",
    Component: dynamic(() => import("./Checkers").then((m) => m.Checkers), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Checkers" />,
    }),
  },
  tetra: {
    name: "Tetra Vault",
    instructions: "Clear 10 lines. Arrows move, up rotates, space drops.",
    Component: dynamic(() => import("./TetraVault").then((m) => m.TetraVault), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Tetra Vault" />,
    }),
  },
  "vault-runner": {
    name: "Vault Runner",
    instructions: "Run right and reach the portal flag. Arrows move, space jumps.",
    Component: dynamic(() => import("./VaultRunner").then((m) => m.VaultRunner), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Vault Runner" />,
    }),
  },
  "star-vanguard": {
    name: "Star Vanguard",
    instructions: "Shoot down the whole alien formation. Arrows move, space fires.",
    Component: dynamic(() => import("./StarVanguard").then((m) => m.StarVanguard), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Star Vanguard" />,
    }),
  },
  minesweeper: {
    name: "Minesweeper",
    instructions: "Open every safe square. 6 mines are hidden; toggle flag mode to mark them.",
    Component: dynamic(() => import("./Minesweeper").then((m) => m.Minesweeper), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Minesweeper" />,
    }),
  },
  "tank-wars": {
    name: "Tank Wars",
    instructions: "Set angle and power, mind the wind, and land a shell on the enemy tank first.",
    Component: dynamic(() => import("./TankWars").then((m) => m.TankWars), {
      ssr: false,
      loading: () => <ArcadeSkeleton label="Loading Tank Wars" />,
    }),
  },
};

export const randomArcadeId = (): string => {
  const ids = Object.keys(ARCADE_COMPONENTS);
  return ids[Math.floor(Math.random() * ids.length)];
};
