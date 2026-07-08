"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Coins, Gamepad2, Send } from "lucide-react";
import { CASINO_COMPONENTS } from "@/components/games/casino";
import { ARCADE_COMPONENTS } from "@/components/games/arcade";
import { settleGame, startGame } from "@/components/games/gameApi";
import { useWalletStore } from "@/store/walletStore";

/** Nano Tech Games hub: casino floor + arcade cabinet + wallet tools. */

const CASINO_META: { id: string; name: string; tagline: string; icon: string }[] = [
  { id: "blackjack", name: "Blackjack", tagline: "Hit 21 · blackjack pays 3:2", icon: "🂡" },
  { id: "roulette", name: "Roulette", tagline: "Straight-up pays 35:1", icon: "🎡" },
  { id: "craps", name: "Craps", tagline: "Ride the pass line", icon: "🎲" },
  { id: "holdem", name: "Texas Hold'em", tagline: "Heads-up vs the house", icon: "🃏" },
  { id: "slots", name: "Nano Slots", tagline: "Three portals pay 100×", icon: "🎰" },
  { id: "pokeno", name: "Pokeno", tagline: "Poker meets bingo", icon: "🀫" },
  { id: "casino-wild", name: "Casino Wild", tagline: "Shed cards, stack bonuses", icon: "🌈" },
  { id: "dominoes", name: "Casino Dominoes", tagline: "Block the house", icon: "🁫" },
  { id: "video-poker", name: "Video Poker", tagline: "9/6 Jacks or Better", icon: "🖥️" },
  { id: "card-flip", name: "Card Flip Duel", tagline: "High card takes it", icon: "⚔️" },
  { id: "three-card-monte", name: "3-Card Monte", tagline: "Follow the queen", icon: "👁️" },
];

export function GamesHubClient() {
  const [active, setActive] = useState<string | null>(null);
  const [arcadeActive, setArcadeActive] = useState<string | null>(null);
  const [arcadeSession, setArcadeSession] = useState<string | null>(null);
  const [arcadeMsg, setArcadeMsg] = useState("");
  const balance = useWalletStore((s) => s.balance);
  const walletCode = useWalletStore((s) => s.walletCode);
  const refresh = useWalletStore((s) => s.refresh);

  // Transfer form.
  const [toCode, setToCode] = useState("");
  const [amount, setAmount] = useState("");
  const [transferMsg, setTransferMsg] = useState("");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ActiveCasino = active ? CASINO_COMPONENTS[active] : null;
  const activeArcade = arcadeActive ? ARCADE_COMPONENTS[arcadeActive] : null;

  const openArcade = async (id: string) => {
    setArcadeActive(id);
    setArcadeMsg("");
    try {
      const { sessionId } = await startGame(id, 0);
      setArcadeSession(sessionId);
    } catch {
      setArcadeSession(null);
    }
  };

  const finishArcade = async (won: boolean) => {
    if (arcadeSession) {
      try {
        const res = await settleGame(arcadeSession, { won });
        setArcadeMsg(
          res.payout > 0 ? `+${res.payout} NB earned!` : "Daily arcade cap reached — no NB this round.",
        );
      } catch {
        setArcadeMsg("");
      }
      setArcadeSession(null);
    }
  };

  const sendTransfer = async () => {
    setTransferMsg("");
    const res = await fetch("/api/wallet/transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toCode: toCode.trim(), amount: Number(amount) }),
    });
    const data = await res.json();
    if (res.ok) {
      setTransferMsg(`Sent ${data.sent} NB!`);
      setToCode("");
      setAmount("");
      void refresh();
    } else {
      setTransferMsg(String(data.error ?? "transfer failed").replace(/_/g, " "));
    }
  };

  if (ActiveCasino || activeArcade) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-4 px-4 py-6">
        <button
          type="button"
          onClick={() => {
            if (arcadeSession) void finishArcade(false);
            setActive(null);
            setArcadeActive(null);
          }}
          className="flex w-fit items-center gap-1.5 text-xs font-semibold tracking-wide text-[#bbcac6] uppercase transition-colors hover:text-[#62f3e4]"
        >
          <ArrowLeft size={14} aria-hidden="true" /> All games
        </button>
        {ActiveCasino && <ActiveCasino />}
        {activeArcade && (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120] p-5">
            <h2 className="mb-1 font-[family-name:var(--font-bungee)] text-base tracking-tight text-[#62f3e4]">
              {activeArcade.name}
            </h2>
            <p className="mb-4 text-xs text-[#bbcac6]">{activeArcade.instructions}</p>
            <activeArcade.Component onFinish={finishArcade} />
            {arcadeMsg && (
              <p className="mt-3 text-center text-sm font-bold text-[#62f3e4]" role="status">
                {arcadeMsg}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-bungee)] text-3xl tracking-tight text-[#62f3e4]">
          Nano Tech Games
        </h1>
        <p className="max-w-xl text-sm text-[#bbcac6]">
          Win <span className="font-bold text-[#62f3e4]">Nano Bucks</span> at the tables and in the
          arcade, then spend them on album and track downloads. Nano Bucks never convert to cash —
          they only unlock music.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 rounded-full border border-[#62f3e4]/40 px-4 py-1.5 font-bold text-[#62f3e4]">
            <Coins size={15} aria-hidden="true" />
            {balance === null ? "…" : balance.toLocaleString()} NB
          </span>
          {walletCode && (
            <span className="rounded-full border border-[rgba(255,255,255,0.12)] px-4 py-1.5 font-mono text-xs text-[#bbcac6]">
              Wallet: {walletCode}
            </span>
          )}
        </div>
      </header>

      <h2 className="mb-3 font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">
        Casino Floor
      </h2>
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CASINO_META.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className="glass-card flex flex-col items-start gap-1.5 rounded-xl p-4 text-left"
          >
            <span className="text-2xl" aria-hidden="true">{g.icon}</span>
            <span className="text-sm font-bold text-[#dde4e2]">{g.name}</span>
            <span className="text-[11px] text-[#b3b3b3]">{g.tagline}</span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">
        <Gamepad2 size={18} className="text-[#ffabef]" aria-hidden="true" /> Arcade Cabinet
      </h2>
      <p className="mb-3 text-xs text-[#b3b3b3]">
        Free to play — win 25 NB, finish 5 NB (up to 12 rewards a day). These are the same
        challenges guarding the album portals.
      </p>
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(ARCADE_COMPONENTS).map(([id, g]) => (
          <button
            key={id}
            type="button"
            onClick={() => void openArcade(id)}
            className="glass-card flex flex-col items-start gap-1 rounded-xl p-4 text-left"
          >
            <span className="text-sm font-bold text-[#dde4e2]">{g.name}</span>
            <span className="text-[10px] text-[#b3b3b3]">Free · win 25 NB</span>
          </button>
        ))}
      </div>

      <h2 className="mb-3 font-[family-name:var(--font-bungee)] text-lg tracking-tight text-[#dde4e2]">
        Send Nano Bucks
      </h2>
      <div className="flex max-w-md flex-col gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120] p-4">
        <p className="text-xs text-[#b3b3b3]">
          Share NB with a friend — ask for their wallet code (shown above their tables).
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={toCode}
            onChange={(e) => setToCode(e.target.value.toUpperCase())}
            placeholder="NTV-XXXXXXXX"
            aria-label="Recipient wallet code"
            className="min-w-36 flex-1 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2 font-mono text-xs text-[#dde4e2] placeholder:text-[#666]"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            placeholder="Amount"
            inputMode="numeric"
            aria-label="Amount of Nano Bucks to send"
            className="w-24 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] px-3 py-2 text-xs text-[#dde4e2] placeholder:text-[#666]"
          />
          <button
            type="button"
            onClick={() => void sendTransfer()}
            disabled={!toCode || !Number(amount)}
            className="flex min-h-9 items-center gap-1.5 rounded-lg bg-[#62f3e4] px-4 py-2 text-xs font-bold tracking-wide text-[#003733] uppercase disabled:opacity-40"
          >
            <Send size={13} aria-hidden="true" /> Send
          </button>
        </div>
        {transferMsg && (
          <p className="text-xs font-semibold text-[#62f3e4]" role="status">{transferMsg}</p>
        )}
      </div>
    </div>
  );
}
