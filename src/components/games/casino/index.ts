import type { ComponentType } from "react";
import { Blackjack } from "./Blackjack";
import { Roulette } from "./Roulette";
import { Craps } from "./Craps";
import { TexasHoldem } from "./TexasHoldem";
import { Slots } from "./Slots";
import { Pokeno } from "./Pokeno";
import { CasinoWild } from "./CasinoWild";
import { CasinoDominoes } from "./CasinoDominoes";
import { VideoPoker } from "./VideoPoker";
import { CardFlip } from "./CardFlip";
import { ThreeCardMonte } from "./ThreeCardMonte";

/** Client registry matching CASINO_GAMES ids in src/lib/nanoBucks.ts. */
export const CASINO_COMPONENTS: Record<string, ComponentType> = {
  blackjack: Blackjack,
  roulette: Roulette,
  craps: Craps,
  holdem: TexasHoldem,
  slots: Slots,
  pokeno: Pokeno,
  "casino-wild": CasinoWild,
  dominoes: CasinoDominoes,
  "video-poker": VideoPoker,
  "card-flip": CardFlip,
  "three-card-monte": ThreeCardMonte,
};
