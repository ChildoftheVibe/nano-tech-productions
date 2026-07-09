/** Game card art (public/games/*.webp) — authored as fixed-canvas HTML in the
 *  NTV design language via the Adobe design workflow and rendered to webp.
 *  Keys match the game ids in src/lib/nanoBucks.ts. */

export const GAME_ART: Record<string, string> = {
  // Casino floor
  blackjack: "/games/blackjack.webp",
  roulette: "/games/roulette.webp",
  craps: "/games/craps.webp",
  holdem: "/games/holdem.webp",
  slots: "/games/slots.webp",
  pokeno: "/games/pokeno.webp",
  "casino-wild": "/games/casino-wild.webp",
  dominoes: "/games/dominoes.webp",
  "video-poker": "/games/video-poker.webp",
  "card-flip": "/games/card-flip.webp",
  "three-card-monte": "/games/three-card-monte.webp",
  // Arcade cabinet / portal challenges
  checkers: "/games/checkers.webp",
  tetra: "/games/tetra.webp",
  "vault-runner": "/games/vault-runner.webp",
  "star-vanguard": "/games/star-vanguard.webp",
  minesweeper: "/games/minesweeper.webp",
  "tank-wars": "/games/tank-wars.webp",
};

/** Wide hub hero banner. */
export const HUB_HERO_ART = "/games/hub-hero.webp";
