"use client";

import { useCallback, useRef, useState } from "react";
import { useWalletStore } from "@/store/walletStore";
import { settleGame, startGame } from "./gameApi";

export type RoundPhase = "idle" | "playing" | "settling" | "done";

export type CasinoRound = {
  phase: RoundPhase;
  stake: number;
  setStake: (n: number) => void;
  /** Last settled result (net payout credited, incl. returned stake). */
  lastPayout: number | null;
  error: string | null;
  /** Debit the stake and open a server session. Resolves false on failure. */
  begin: () => Promise<boolean>;
  /** Debit extra stake mid-round (double down / call). */
  raise: (amount: number) => Promise<boolean>;
  /** Settle the round. `payout` is the total NB to credit (0 = lost stake). */
  finish: (payout: number, detail?: Record<string, unknown>) => Promise<void>;
  reset: () => void;
};

/** Manages one casino round's server lifecycle (start → raise* → settle). */
export function useCasinoRound(gameId: string, defaultStake = 10): CasinoRound {
  const [phase, setPhase] = useState<RoundPhase>("idle");
  const [stake, setStake] = useState(defaultStake);
  const [lastPayout, setLastPayout] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const begin = useCallback(async () => {
    setError(null);
    try {
      const { sessionId } = await startGame(gameId, stake);
      sessionRef.current = sessionId;
      setPhase("playing");
      setLastPayout(null);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "start_failed");
      return false;
    }
  }, [gameId, stake]);

  const raise = useCallback(async (amount: number) => {
    if (!sessionRef.current) return false;
    try {
      const res = await fetch("/api/games/raise", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: sessionRef.current, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "raise_failed");
      useWalletStore.getState().setBalance(data.balance);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "raise_failed");
      return false;
    }
  }, []);

  const finish = useCallback(async (payout: number, detail?: Record<string, unknown>) => {
    const sessionId = sessionRef.current;
    if (!sessionId) return;
    sessionRef.current = null;
    setPhase("settling");
    try {
      const res = await settleGame(sessionId, { payout, won: payout > 0, detail });
      setLastPayout(res.payout);
    } catch (e) {
      setError(e instanceof Error ? e.message : "settle_failed");
    } finally {
      setPhase("done");
    }
  }, []);

  const reset = useCallback(() => {
    sessionRef.current = null;
    setPhase("idle");
    setLastPayout(null);
    setError(null);
  }, []);

  return { phase, stake, setStake, lastPayout, error, begin, raise, finish, reset };
}
