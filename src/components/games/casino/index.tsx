import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { ArcadeSkeleton } from "../arcade/ArcadeSkeleton";

/** Client registry matching CASINO_GAMES ids in src/lib/nanoBucks.ts.
 *
 *  Each table is lazy-loaded via next/dynamic so opening the games hub
 *  doesn't pull in all eleven tables' code up front — only the one the
 *  visitor actually opens downloads. */
const loading = (label: string) =>
  function CasinoTableLoading() {
    return <ArcadeSkeleton label={`Loading ${label}`} />;
  };

export const CASINO_COMPONENTS: Record<string, ComponentType> = {
  blackjack: dynamic(() => import("./Blackjack").then((m) => m.Blackjack), { ssr: false, loading: loading("Blackjack") }),
  roulette: dynamic(() => import("./Roulette").then((m) => m.Roulette), { ssr: false, loading: loading("Roulette") }),
  craps: dynamic(() => import("./Craps").then((m) => m.Craps), { ssr: false, loading: loading("Craps") }),
  holdem: dynamic(() => import("./TexasHoldem").then((m) => m.TexasHoldem), { ssr: false, loading: loading("Texas Hold'em") }),
  slots: dynamic(() => import("./Slots").then((m) => m.Slots), { ssr: false, loading: loading("Nano Slots") }),
  pokeno: dynamic(() => import("./Pokeno").then((m) => m.Pokeno), { ssr: false, loading: loading("Pokeno") }),
  "casino-wild": dynamic(() => import("./CasinoWild").then((m) => m.CasinoWild), { ssr: false, loading: loading("Casino Wild") }),
  dominoes: dynamic(() => import("./CasinoDominoes").then((m) => m.CasinoDominoes), { ssr: false, loading: loading("Casino Dominoes") }),
  "video-poker": dynamic(() => import("./VideoPoker").then((m) => m.VideoPoker), { ssr: false, loading: loading("Video Poker") }),
  "card-flip": dynamic(() => import("./CardFlip").then((m) => m.CardFlip), { ssr: false, loading: loading("Card Flip Duel") }),
  "three-card-monte": dynamic(() => import("./ThreeCardMonte").then((m) => m.ThreeCardMonte), { ssr: false, loading: loading("3-Card Monte") }),
};
