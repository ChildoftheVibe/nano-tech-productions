"use client";

import { useWalletStore } from "@/store/walletStore";

/** Client helpers for the game session lifecycle. Keeps the wallet badge in
 *  sync with every stake/payout the server reports. */

export type StartResult = { sessionId: string; balance: number };
export type SettleResult = { payout: number; balance: number; capped: boolean };

export async function startGame(gameId: string, stake = 0): Promise<StartResult> {
  const res = await fetch("/api/games/start", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId, stake }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "start_failed");
  useWalletStore.getState().setBalance(data.balance);
  return data as StartResult;
}

export async function settleGame(
  sessionId: string,
  opts: { won?: boolean; payout?: number; detail?: Record<string, unknown> },
): Promise<SettleResult> {
  const res = await fetch("/api/games/settle", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId, ...opts }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "settle_failed");
  useWalletStore.getState().setBalance(data.balance);
  return data as SettleResult;
}
