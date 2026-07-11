import { Domino, dominoKey, isDouble, pips, sharesSide } from "./types";

/** Best qualifying connection between any hand card and the community card. */
export function mainPoints(hand: Domino[], community: Domino): number {
  let best = 0;
  for (const card of hand) {
    const p = connectionPoints(card, community);
    if (p > best) best = p;
  }
  return best;
}

function connectionPoints(player: Domino, community: Domino): number {
  if (!sharesSide(player, community)) return 0;
  const total = pips(player) + pips(community);
  return total % 5 === 0 && total > 0 ? total : 0;
}

/** Index of the hand tile producing the best connection (-1 if none scores). */
export function bestConnectionIndex(hand: Domino[], community: Domino): number {
  let best = 0;
  let bestIndex = -1;
  hand.forEach((card, i) => {
    const p = connectionPoints(card, community);
    if (p > best) {
      best = p;
      bestIndex = i;
    }
  });
  return bestIndex;
}

/** Doubles side-bet outcome label, judged over the hand + this round's community tile. */
export function doublesOutcome(hand: Domino[], community: Domino): string {
  const all = [...hand, community];
  const doubles = all.filter(isDouble);
  const distinct = [...new Set(doubles.map(dominoKey))];

  if (["3-3", "4-4", "5-5", "6-6"].every((x) => distinct.includes(x))) {
    return "MAIDENS_HAND";
  }
  const counts = new Map<string, number>();
  for (const d of doubles) counts.set(dominoKey(d), (counts.get(dominoKey(d)) ?? 0) + 1);
  const pairsOfSame = [...counts.values()].filter((c) => c >= 2).length;
  if (pairsOfSame >= 2) return "DOUBLE_DOUBLES";
  if (doubles.length >= 4) return "FOUR_DOUBLES";
  if (doubles.length === 3) return "THREE_DOUBLES";
  if (doubles.length === 2) return "TWO_DOUBLES";
  return "NONE";
}

/** Main-bet payout multiplier for a connection's point total (0 if no tier matches). */
export function mainPayoutMultiplier(points: number, table: Record<number, number>): number {
  return table[points] ?? 0;
}
