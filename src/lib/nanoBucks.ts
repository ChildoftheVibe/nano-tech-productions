import "server-only";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/db/admin";

/**
 * Nano Bucks — closed-loop virtual currency.
 *
 * Identity: an anonymous wallet keyed by an HMAC-signed cookie
 * (`ntv_wallet` = `<secret>.<hmac>`). The DB stores only sha256(secret), so a
 * leaked table can't be replayed into cookies. Visitors can later attach an
 * email/display name to make their wallet code shareable.
 *
 * Fairness: every game round is a `game_sessions` row. Casino rounds debit the
 * stake when the session opens and can be settled exactly once, with the
 * payout capped at the game's maximum multiplier server-side. Nano Bucks are
 * never redeemable for cash — only for track/album downloads — which keeps
 * this a gamification loop, not gambling.
 */

const WALLET_COOKIE = "ntv_wallet";
const hmacSecret = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export {
  ARCADE_WIN_REWARD,
  ARCADE_PLAY_REWARD,
  ARCADE_DAILY_CAP,
  SIGNUP_BONUS,
} from "@/lib/nanoBucksShared";
import { SIGNUP_BONUS } from "@/lib/nanoBucksShared";

export type GameMode = "arcade" | "casino";

export type GameDef = {
  id: string;
  name: string;
  mode: GameMode;
  /** Casino only: stake bounds. */
  minStake?: number;
  maxStake?: number;
  /** Casino only: hard server-side cap on payout as a multiple of stake. */
  maxMultiplier?: number;
  tagline: string;
};

export const ARCADE_GAMES: GameDef[] = [
  { id: "checkers", name: "Checkers", mode: "arcade", tagline: "Beat the vault AI across the board" },
  { id: "tetra", name: "Tetra Vault", mode: "arcade", tagline: "Clear 10 lines to breach the vault" },
  { id: "vault-runner", name: "Vault Runner", mode: "arcade", tagline: "Run, jump, reach the portal flag" },
  { id: "star-vanguard", name: "Star Vanguard", mode: "arcade", tagline: "Clear the alien wave" },
  { id: "minesweeper", name: "Minesweeper", mode: "arcade", tagline: "Sweep the grid without detonating" },
  { id: "tank-wars", name: "Tank Wars", mode: "arcade", tagline: "Out-shell the enemy tank" },
];

export const CASINO_GAMES: GameDef[] = [
  { id: "blackjack", name: "Blackjack", mode: "casino", minStake: 5, maxStake: 500, maxMultiplier: 4, tagline: "Hit 21, double down, beat the dealer" },
  { id: "roulette", name: "Roulette", mode: "casino", minStake: 1, maxStake: 250, maxMultiplier: 36, tagline: "Straight-up pays 35:1" },
  { id: "craps", name: "Craps", mode: "casino", minStake: 5, maxStake: 250, maxMultiplier: 8, tagline: "Ride the pass line" },
  { id: "holdem", name: "Texas Hold'em", mode: "casino", minStake: 5, maxStake: 250, maxMultiplier: 12, tagline: "Heads-up against the house" },
  { id: "slots", name: "Nano Slots", mode: "casino", minStake: 1, maxStake: 100, maxMultiplier: 100, tagline: "Line up three portals" },
  { id: "pokeno", name: "Pokeno", mode: "casino", minStake: 5, maxStake: 100, maxMultiplier: 25, tagline: "Poker hands on a bingo board" },
  { id: "casino-wild", name: "Casino Wild", mode: "casino", minStake: 5, maxStake: 200, maxMultiplier: 8, tagline: "Shed your hand — every card left in the house's hand pays" },
  { id: "dominoes", name: "Casino Dominoes", mode: "casino", minStake: 5, maxStake: 200, maxMultiplier: 40, tagline: "Connect the community tile, ride the doubles" },
  { id: "video-poker", name: "Video Poker", mode: "casino", minStake: 1, maxStake: 100, maxMultiplier: 250, tagline: "9/6 Jacks or Better" },
  { id: "card-flip", name: "Card Flip Duel", mode: "casino", minStake: 1, maxStake: 500, maxMultiplier: 2, tagline: "High card takes the pot" },
  { id: "three-card-monte", name: "3-Card Monte", mode: "casino", minStake: 5, maxStake: 200, maxMultiplier: 3, tagline: "Follow the queen" },
];

export const ALL_GAMES = [...ARCADE_GAMES, ...CASINO_GAMES];
export const gameById = (id: string): GameDef | undefined =>
  ALL_GAMES.find((g) => g.id === id);

const sign = (secret: string): string =>
  createHmac("sha256", hmacSecret()).update(secret).digest("hex");

const hashSecret = (secret: string): string =>
  createHash("sha256").update(secret).digest("hex");

const walletCode = (): string =>
  `NTV-${randomBytes(4).toString("hex").toUpperCase()}`;

export type Wallet = {
  id: string;
  wallet_code: string;
  display_name: string | null;
  email: string | null;
  balance: number;
  lifetime_earned: number;
};

const WALLET_COLUMNS = "id, wallet_code, display_name, email, balance, lifetime_earned";

/** Parse + verify the wallet cookie; returns the secret or null. */
function verifyCookie(raw: string | undefined): string | null {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const secret = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = sign(secret);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return secret;
}

/** Look up the wallet for the current request's cookie. Does NOT create. */
export async function getWallet(): Promise<Wallet | null> {
  const jar = await cookies();
  const secret = verifyCookie(jar.get(WALLET_COOKIE)?.value);
  if (!secret) return null;
  const { data } = await supabaseAdmin
    .from("wallets")
    .select(WALLET_COLUMNS)
    .eq("wallet_key_hash", hashSecret(secret))
    .maybeSingle();
  return (data as Wallet | null) ?? null;
}

/**
 * Get the wallet for this visitor, creating one (with the signup bonus) if
 * none exists. Only call from route handlers — sets the wallet cookie.
 */
export async function getOrCreateWallet(): Promise<Wallet> {
  const existing = await getWallet();
  if (existing) return existing;

  const secret = randomBytes(24).toString("hex");
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .insert({
      wallet_key_hash: hashSecret(secret),
      wallet_code: walletCode(),
      balance: SIGNUP_BONUS,
      lifetime_earned: SIGNUP_BONUS,
    })
    .select(WALLET_COLUMNS)
    .single();
  if (error || !data) throw new Error("wallet_create_failed");

  await supabaseAdmin.from("wallet_transactions").insert({
    wallet_id: data.id,
    amount: SIGNUP_BONUS,
    balance_after: SIGNUP_BONUS,
    tx_type: "bonus",
    ref: "signup",
  });

  const jar = await cookies();
  jar.set(WALLET_COOKIE, `${secret}.${sign(secret)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });

  return data as Wallet;
}

/**
 * Attach an email (+ optional display name) to the current visitor's wallet
 * — the "login" step gating casino play. Creates the wallet first if the
 * visitor doesn't have one yet.
 */
export async function claimWallet(email: string, displayName?: string): Promise<Wallet> {
  const wallet = await getOrCreateWallet();
  const { data, error } = await supabaseAdmin
    .from("wallets")
    .update({
      email,
      display_name: displayName?.trim() || wallet.display_name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", wallet.id)
    .select(WALLET_COLUMNS)
    .single();
  if (error || !data) throw new Error("wallet_claim_failed");
  return data as Wallet;
}

/** Atomic balance adjustment via the wallet_adjust RPC. Returns new balance. */
export async function adjustBalance(
  walletId: string,
  amount: number,
  txType: string,
  ref?: string,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("wallet_adjust", {
    p_wallet_id: walletId,
    p_amount: Math.round(amount),
    p_tx_type: txType,
    p_ref: ref ?? null,
    p_metadata: metadata ?? {},
  });
  if (error) {
    // Postgres check-constraint violation = insufficient funds.
    if (error.code === "23514") throw new Error("insufficient_funds");
    throw new Error("wallet_adjust_failed");
  }
  return Number(data);
}

/** Count arcade rewards earned today (UTC) for the daily cap. */
export async function arcadeRewardsToday(walletId: string): Promise<number> {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id", { count: "exact", head: true })
    .eq("wallet_id", walletId)
    .eq("tx_type", "earn_game")
    .gte("created_at", dayStart.toISOString());
  return count ?? 0;
}
