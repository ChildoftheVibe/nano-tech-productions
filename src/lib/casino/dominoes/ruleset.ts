export interface Ruleset {
  cardsPerHand: number;
  minMainBet: number;
  maxMainBet: number;
  minDoublesBet: number;
  maxDoublesBet: number;
  /** points -> multiplier of that round's mainBet */
  mainPayouts: Record<number, number>;
  /** doubles outcome label -> multiplier of that round's doublesBet */
  doublesPayouts: Record<string, number>;
}

export const DEFAULT_RULESET: Ruleset = {
  cardsPerHand: 3,
  minMainBet: 5,
  maxMainBet: 150,
  minDoublesBet: 0,
  maxDoublesBet: 50,
  mainPayouts: {
    5: 2,
    10: 3,
    15: 6,
    20: 10,
  },
  doublesPayouts: {
    MAIDENS_HAND: 200,
    DOUBLE_DOUBLES: 50,
    FOUR_DOUBLES: 20,
    THREE_DOUBLES: 5,
    TWO_DOUBLES: 2,
    NONE: 0,
  },
};
