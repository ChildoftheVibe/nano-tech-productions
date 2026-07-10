"use client";

import { create } from "zustand";

type WalletState = {
  balance: number | null;
  walletCode: string | null;
  lifetimeEarned: number;
  /** Set once the visitor has claimed their wallet with an email — required
   *  to play casino games. */
  email: string | null;
  loading: boolean;
  /** Fetch (or lazily create) the wallet. Safe to call repeatedly. */
  refresh: () => Promise<void>;
  /** Optimistically set balance from an API response that returned it. */
  setBalance: (balance: number) => void;
  /** Applied after a successful /api/wallet/verify/confirm call. */
  setEmail: (email: string) => void;
};

let inflight: Promise<void> | null = null;

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: null,
  walletCode: null,
  lifetimeEarned: 0,
  email: null,
  loading: false,

  refresh: async () => {
    if (inflight) return inflight;
    inflight = (async () => {
      set({ loading: true });
      try {
        const res = await fetch("/api/wallet", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          balance: number;
          walletCode: string;
          lifetimeEarned: number;
          email: string | null;
        };
        set({
          balance: data.balance,
          walletCode: data.walletCode,
          lifetimeEarned: data.lifetimeEarned,
          email: data.email,
        });
      } catch {
        // Offline / API down — badge just keeps its last value.
      } finally {
        set({ loading: false });
        inflight = null;
      }
    })();
    return inflight;
  },

  setBalance: (balance) => {
    if (balance !== get().balance) set({ balance });
  },

  setEmail: (email) => {
    set({ email });
  },
}));
