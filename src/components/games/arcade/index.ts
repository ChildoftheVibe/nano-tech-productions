import type { ComponentType } from "react";
import type { ArcadeProps } from "./Minesweeper";
import { Minesweeper } from "./Minesweeper";
import { TetraVault } from "./TetraVault";
import { StarVanguard } from "./StarVanguard";
import { VaultRunner } from "./VaultRunner";
import { TankWars } from "./TankWars";
import { Checkers } from "./Checkers";

export type { ArcadeProps };

/** Client-side registry matching ARCADE_GAMES ids in src/lib/nanoBucks.ts. */
export const ARCADE_COMPONENTS: Record<
  string,
  { name: string; instructions: string; Component: ComponentType<ArcadeProps> }
> = {
  checkers: {
    name: "Checkers",
    instructions: "Capture every AI piece. Tap a teal piece, then a highlighted square.",
    Component: Checkers,
  },
  tetra: {
    name: "Tetra Vault",
    instructions: "Clear 10 lines. Arrows move, up rotates, space drops.",
    Component: TetraVault,
  },
  "vault-runner": {
    name: "Vault Runner",
    instructions: "Run right and reach the portal flag. Arrows move, space jumps.",
    Component: VaultRunner,
  },
  "star-vanguard": {
    name: "Star Vanguard",
    instructions: "Shoot down the whole alien formation. Arrows move, space fires.",
    Component: StarVanguard,
  },
  minesweeper: {
    name: "Minesweeper",
    instructions: "Open every safe square — 10 mines are hidden. Toggle flag mode to mark them.",
    Component: Minesweeper,
  },
  "tank-wars": {
    name: "Tank Wars",
    instructions: "Set angle and power, mind the wind, and land a shell on the enemy tank first.",
    Component: TankWars,
  },
};

export const randomArcadeId = (): string => {
  const ids = Object.keys(ARCADE_COMPONENTS);
  return ids[Math.floor(Math.random() * ids.length)];
};
