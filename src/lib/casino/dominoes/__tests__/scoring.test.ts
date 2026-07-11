import { doublesOutcome, mainPayoutMultiplier, mainPoints } from "../scoring";
import { DEFAULT_RULESET } from "../ruleset";
import type { Domino } from "../types";

const d = (a: number, b: number): Domino => ({ a: a as Domino["a"], b: b as Domino["b"] });

describe("mainPoints", () => {
  it("scores the best connection whose pip total is a multiple of 5", () => {
    // hand has 3-2 (sum 5 with community 0-0? no shared side) -- build explicit cases
    const community = d(4, 3);
    const hand = [d(1, 1), d(2, 4), d(6, 6)];
    // 2-4 shares the 4 with community 4-3: total = 6+7=13, not mult of 5 -> 0
    // 1-1 shares nothing with 4-3 -> 0
    // 6-6 shares nothing with 4-3 -> 0
    expect(mainPoints(hand, community)).toBe(0);
  });

  it("finds a scoring connection", () => {
    const community = d(3, 2); // pips 5
    const hand = [d(3, 0)]; // shares the 3; pips 3; total 8 -> not mult of 5
    expect(mainPoints(hand, community)).toBe(0);
    const hand2 = [d(2, 3)]; // shares both; pips 5; total 10 -> scores
    expect(mainPoints(hand2, community)).toBe(10);
  });

  it("ignores non-matching tiles and returns the best of several matches", () => {
    const community = d(5, 5); // pips 10
    const points = mainPoints([d(1, 1), d(5, 0)], community);
    // 5-0 shares the 5; pips 5; total 15 -> scores 15
    expect(points).toBe(15);
  });

  it("returns 0 when no tile shares a side with the community", () => {
    const community = d(6, 6);
    const hand = [d(1, 2), d(3, 4)];
    expect(mainPoints(hand, community)).toBe(0);
  });
});

describe("mainPayoutMultiplier", () => {
  it("maps ruleset tiers exactly", () => {
    expect(mainPayoutMultiplier(5, DEFAULT_RULESET.mainPayouts)).toBe(2);
    expect(mainPayoutMultiplier(10, DEFAULT_RULESET.mainPayouts)).toBe(3);
    expect(mainPayoutMultiplier(20, DEFAULT_RULESET.mainPayouts)).toBe(10);
  });

  it("returns 0 for points with no configured tier", () => {
    expect(mainPayoutMultiplier(0, DEFAULT_RULESET.mainPayouts)).toBe(0);
    expect(mainPayoutMultiplier(7, DEFAULT_RULESET.mainPayouts)).toBe(0);
    expect(mainPayoutMultiplier(100, DEFAULT_RULESET.mainPayouts)).toBe(0);
  });
});

describe("doublesOutcome", () => {
  it("detects MAIDENS_HAND when all four target doubles are present", () => {
    const hand = [d(3, 3), d(4, 4), d(5, 5)];
    const community = d(6, 6);
    expect(doublesOutcome(hand, community)).toBe("MAIDENS_HAND");
  });

  it("detects TWO_DOUBLES", () => {
    const hand = [d(1, 1), d(2, 2), d(0, 3)];
    const community = d(6, 5);
    expect(doublesOutcome(hand, community)).toBe("TWO_DOUBLES");
  });

  it("detects THREE_DOUBLES", () => {
    const hand = [d(1, 1), d(2, 2), d(0, 3)];
    const community = d(6, 6);
    expect(doublesOutcome(hand, community)).toBe("THREE_DOUBLES");
  });

  it("returns NONE when no doubles are present", () => {
    const hand = [d(1, 2), d(3, 4), d(0, 5)];
    const community = d(6, 1);
    expect(doublesOutcome(hand, community)).toBe("NONE");
  });

  it("returns FOUR_DOUBLES when all four tiles are (distinct) doubles", () => {
    const hand = [d(0, 0), d(1, 1), d(2, 2)];
    const community = d(6, 6);
    expect(doublesOutcome(hand, community)).toBe("FOUR_DOUBLES");
  });
});
