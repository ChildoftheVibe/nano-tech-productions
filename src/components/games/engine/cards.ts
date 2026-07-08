/** Shared playing-card engine for the casino games. */

export type Suit = "♠" | "♥" | "♦" | "♣";
export type Card = { rank: number; suit: Suit }; // rank 2–14 (14 = Ace)

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANK_LABEL: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
  10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};

export const isRed = (c: Card) => c.suit === "♥" || c.suit === "♦";
export const cardLabel = (c: Card) => `${RANK_LABEL[c.rank]}${c.suit}`;

export function freshDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const shuffledDeck = () => shuffle(freshDeck());

/** Blackjack hand value (aces soft where possible). */
export function bjValue(hand: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.rank === 14) {
      aces++;
      total += 11;
    } else {
      total += Math.min(c.rank, 10);
    }
  }
  let soft = aces > 0;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
    soft = aces > 0;
  }
  return { total, soft };
}

export type PokerHandRank =
  | "high-card" | "pair" | "two-pair" | "trips" | "straight"
  | "flush" | "full-house" | "quads" | "straight-flush" | "royal-flush";

const HAND_ORDER: PokerHandRank[] = [
  "high-card", "pair", "two-pair", "trips", "straight",
  "flush", "full-house", "quads", "straight-flush", "royal-flush",
];

export type PokerEval = { rank: PokerHandRank; score: number; label: string };

const HAND_LABEL: Record<PokerHandRank, string> = {
  "high-card": "High Card", pair: "Pair", "two-pair": "Two Pair",
  trips: "Three of a Kind", straight: "Straight", flush: "Flush",
  "full-house": "Full House", quads: "Four of a Kind",
  "straight-flush": "Straight Flush", "royal-flush": "Royal Flush",
};

/** Evaluate exactly 5 cards. Score orders any two hands correctly. */
export function evalFive(cards: Card[]): PokerEval {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  // Straight (wheel A-2-3-4-5 counts, ace low).
  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[1] - uniq[4] === 3) straightHigh = 5;
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Sort by count desc, then rank desc — gives kicker ordering.
  const grouped = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const shape = grouped.map(([, n]) => n).join("");

  let rank: PokerHandRank = "high-card";
  if (straightHigh && flush) rank = straightHigh === 14 ? "royal-flush" : "straight-flush";
  else if (shape.startsWith("4")) rank = "quads";
  else if (shape === "32") rank = "full-house";
  else if (flush) rank = "flush";
  else if (straightHigh) rank = "straight";
  else if (shape.startsWith("3")) rank = "trips";
  else if (shape === "221") rank = "two-pair";
  else if (shape.startsWith("2")) rank = "pair";

  const ordered = straightHigh
    ? [straightHigh]
    : grouped.map(([r]) => r);
  let score = HAND_ORDER.indexOf(rank);
  for (const r of ordered.slice(0, 5)) score = score * 15 + r;
  for (let i = ordered.length; i < 5; i++) score *= 15;
  return { rank, score, label: HAND_LABEL[rank] };
}

/** Best 5-card hand from 5–7 cards. */
export function evalBest(cards: Card[]): PokerEval {
  if (cards.length === 5) return evalFive(cards);
  let best: PokerEval | null = null;
  const n = cards.length;
  // Generic choose-5 enumeration.
  const idx = [...Array(n).keys()];
  const combos: number[][] = [];
  const pick = (start: number, chosen: number[]) => {
    if (chosen.length === 5) {
      combos.push([...chosen]);
      return;
    }
    for (let i = start; i < n; i++) pick(i + 1, [...chosen, idx[i]]);
  };
  pick(0, []);
  for (const combo of combos) {
    const ev = evalFive(combo.map((i) => cards[i]));
    if (!best || ev.score > best.score) best = ev;
  }
  return best!;
}
