export type Pip = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Domino {
  a: Pip;
  b: Pip;
}

export const isDouble = (d: Domino): boolean => d.a === d.b;
export const pips = (d: Domino): number => d.a + d.b;
export const sharesSide = (x: Domino, y: Domino): boolean =>
  x.a === y.a || x.a === y.b || x.b === y.a || x.b === y.b;

export const dominoKey = (d: Domino): string => `${d.a}-${d.b}`;
