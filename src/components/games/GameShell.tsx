"use client";

import { useEffect, useState } from "react";
import { Coins, Minus, Plus } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";
import { useGameKeyboardLock } from "@/store/gameFocusStore";
import { cardLabel, isRed, type Card } from "./engine/cards";

/** Theme overrides written by the ui-implementer agent (game_ui_config). */
export type GameUiConfig = {
  accent?: string;
  felt?: string;
  cardRadius?: number;
  chipColors?: string[];
};

let cachedConfig: GameUiConfig | null = null;

export function useGameUiConfig(): GameUiConfig {
  const [config, setConfig] = useState<GameUiConfig>(cachedConfig ?? {});
  useEffect(() => {
    if (cachedConfig) return;
    fetch("/api/games/ui-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) {
          cachedConfig = data.config as GameUiConfig;
          setConfig(cachedConfig);
        }
      })
      .catch(() => {});
  }, []);
  return config;
}

/** Shared chrome for every casino table: title bar, balance, felt surface.
 *  `art` (from GAME_ART) renders as an ambient backdrop behind the felt. */
export function GameShell({
  title,
  tagline,
  art,
  children,
}: {
  title: string;
  tagline?: string;
  art?: string;
  children: React.ReactNode;
}) {
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);
  const ui = useGameUiConfig();
  const accent = ui.accent ?? "#62f3e4";
  const felt = ui.felt ?? "#0d1a17";

  // Hold the keyboard so media shortcuts don't fire while a table is open.
  useGameKeyboardLock();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#1a2120]">
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="min-w-0">
          <h2
            className="truncate font-[family-name:var(--font-bungee)] text-base tracking-tight"
            style={{ color: accent }}
          >
            {title}
          </h2>
          {tagline && (
            <p className="truncate text-[11px] text-[#bbcac6]">{tagline}</p>
          )}
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold tabular-nums"
          style={{ borderColor: `${accent}55`, color: accent }}
          aria-live="polite"
        >
          <Coins size={13} aria-hidden="true" />
          {balance === null ? "…" : balance.toLocaleString()} NB
        </div>
      </div>
      <div
        className="relative flex-1 overflow-y-auto p-4"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${felt} 0%, #090f0e 100%)`,
        }}
      >
        {art && (
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.12] blur-[3px]"
            style={{ backgroundImage: `url(${art})` }}
            aria-hidden="true"
          />
        )}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

/** Stake picker used by every table while a round is idle. */
export function StakeControls({
  stake,
  setStake,
  min,
  max,
  disabled,
}: {
  stake: number;
  setStake: (n: number) => void;
  min: number;
  max: number;
  disabled?: boolean;
}) {
  const balance = useWalletStore((s) => s.balance) ?? 0;
  const cap = Math.min(max, Math.max(min, balance));
  const bump = (delta: number) =>
    setStake(Math.min(cap, Math.max(min, stake + delta)));
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#242b2a] text-[#dde4e2] transition-colors hover:border-[#62f3e4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62f3e4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17] disabled:opacity-40";

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Bet amount">
      <span className="text-[11px] tracking-wide text-[#bbcac6] uppercase" aria-hidden="true">Bet</span>
      <button
        type="button"
        className={btn}
        onClick={() => bump(-5)}
        disabled={disabled || stake <= min}
        aria-label={`Decrease bet, currently ${stake} Nano Bucks`}
      >
        <Minus size={16} aria-hidden="true" />
      </button>
      <span
        className="min-w-16 rounded-lg bg-[#242b2a] px-3 py-2.5 text-center text-sm font-bold tabular-nums text-[#62f3e4]"
        aria-live="polite"
      >
        {stake} NB
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => bump(5)}
        disabled={disabled || stake >= cap}
        aria-label={`Increase bet, currently ${stake} Nano Bucks`}
      >
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Accent CTA used across the tables. */
export function TableButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "outline";
}) {
  const base =
    "min-h-11 min-w-[88px] rounded-lg px-5 py-2.5 text-xs font-bold tracking-[0.06em] uppercase transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-40 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1a17]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        variant === "primary"
          ? `${base} bg-[#62f3e4] text-[#003733] teal-glow`
          : `${base} border border-[rgba(255,255,255,0.15)] text-[#dde4e2] hover:border-[#62f3e4]`
      }
    >
      {children}
    </button>
  );
}

/** Result banner shown after settle. */
export function ResultBanner({
  payout,
  stake,
  onNext,
}: {
  payout: number | null;
  stake: number;
  onNext: () => void;
}) {
  if (payout === null) return null;
  const net = payout - stake;
  const won = net > 0;
  const push = net === 0 && payout > 0;
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 rounded-xl border px-6 py-4 text-center"
      style={{
        borderColor: won ? "#62f3e466" : push ? "#ffffff33" : "#ff6b6b55",
        background: "rgba(9,15,14,0.75)",
      }}
    >
      <p
        className="font-[family-name:var(--font-bungee)] text-lg tracking-tight"
        style={{ color: won ? "#62f3e4" : push ? "#dde4e2" : "#ff8a8a" }}
      >
        {won ? `+${net.toLocaleString()} NB` : push ? "Push" : `-${Math.abs(net).toLocaleString()} NB`}
      </p>
      <TableButton onClick={onNext}>Play Again</TableButton>
    </div>
  );
}

/** Rendered playing card. `hidden` shows the vault-teal card back. */
export function PlayingCard({
  card,
  hidden,
  small,
}: {
  card?: Card;
  hidden?: boolean;
  small?: boolean;
}) {
  const ui = useGameUiConfig();
  const radius = ui.cardRadius ?? 8;
  const size = small ? "h-14 w-10 text-sm" : "h-20 w-14 text-lg";
  if (hidden || !card) {
    return (
      <div
        className={`${size} shrink-0 border border-[#62f3e4]/40 bg-[repeating-linear-gradient(45deg,#12403a,#12403a_4px,#0d2f2b_4px,#0d2f2b_8px)]`}
        style={{ borderRadius: radius }}
        aria-label="Face-down card"
      />
    );
  }
  return (
    <div
      className={`${size} flex shrink-0 flex-col items-center justify-center border border-black/20 bg-[#f4f1e8] font-bold shadow-md`}
      style={{ borderRadius: radius, color: isRed(card) ? "#c0392b" : "#1a1a1a" }}
      aria-label={cardLabel(card)}
    >
      {cardLabel(card)}
    </div>
  );
}
