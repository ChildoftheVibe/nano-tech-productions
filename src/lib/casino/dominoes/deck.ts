import { Domino, Pip } from "./types";

/** Full double-six set, 28 unique tiles (a <= b). */
export function fullSet(): Domino[] {
  const set: Domino[] = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) set.push({ a: a as Pip, b: b as Pip });
  }
  return set;
}

/** Cryptographically-random Fisher-Yates shuffle (client trust model matches
 *  every other casino table here: the server caps the payout, it doesn't
 *  referee the shuffle). */
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  const bytes = new Uint32Array(out.length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 2 ** 32);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
