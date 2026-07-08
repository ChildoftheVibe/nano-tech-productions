"use client";

import { create } from "zustand";

type WalletState = {
  balance: number | null;
  walletCode: string | null;
  lifetimeEarned: number;
  loading: boolean;
  /** Fetch (or lazily create) the wallet. Safe to call repeatedly. */
  refresh: () => Promise<void>;
  /** Optimistically set balance from an API response that returned it. */
  setBalance: (balance: number) => void;
};

let inflight: Promise<void> | null = null;

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: null,
  walletCode: null,
  lifetimeEarned: 0,
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
        };
        set({
          balance: data.balance,
          walletCode: data.walletCode,
          lifetimeEarned: data.lifetimeEarned,
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
}));
