"use client";

import { useCallback, useState } from "react";
import { Coins } from "lucide-react";
import { useWalletStore } from "@/store/walletStore";
import { saveDownloadToken } from "@/lib/downloadTokens";

type Props = {
  kind: "track" | "album";
  id: string;
  nbPrice: number;
  name: string;
  accent: string;
  /** Compact rendering for menu rows. */
  compact?: boolean;
};

/**
 * "Redeem with Nano Bucks" — spends NB via /api/wallet/redeem and starts the
 * MP3 downloads the server minted. Shown wherever a USD Buy control exists so
 * both prices are always visible side by side.
 */
export function RedeemButton({ kind, id, nbPrice, name, accent, compact }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const balance = useWalletStore((s) => s.balance);
  const refresh = useWalletStore((s) => s.refresh);

  const redeem = useCallback(async () => {
    if (state === "busy") return;
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/wallet/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMessage(
          data.error === "insufficient_funds"
            ? `Need ${nbPrice.toLocaleString()} NB. Play games to earn more.`
            : String(data.error ?? "redeem failed").replace(/_/g, " "),
        );
        return;
      }
      void refresh();
      // Kick off each minted download; stash tokens for re-download.
      const downloads = (data.downloads ?? []) as { trackId: string; url: string }[];
      downloads.forEach((d, i) => {
        const token = d.url.split("/").pop();
        if (token) saveDownloadToken(d.trackId, token);
        window.setTimeout(() => {
          const a = document.createElement("a");
          a.href = d.url;
          a.rel = "noopener";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }, i * 800);
      });
      setState("done");
      setMessage(`Redeemed ${name}. Download starting.`);
    } catch {
      setState("error");
      setMessage("redeem failed");
    }
  }, [state, kind, id, nbPrice, name, refresh]);

  const short = balance !== null && balance < nbPrice;

  if (compact) {
    return (
      <button
        onClick={() => void redeem()}
        disabled={state === "busy" || state === "done"}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--album-hover)]"
        style={{ boxShadow: "none" }}
        title={message || undefined}
      >
        <Coins size={15} style={{ color: accent, flexShrink: 0 }} />
        {state === "done" ? "Redeemed!" : `Redeem · ${nbPrice.toLocaleString()} NB`}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={() => void redeem()}
        disabled={state === "busy" || state === "done"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderRadius: 8,
          padding: "12px 20px",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          background: "transparent",
          cursor: "pointer",
          flexShrink: 0,
          border: `1px solid ${accent}`,
          color: accent,
          opacity: state === "busy" ? 0.6 : 1,
        }}
        aria-label={`Redeem ${name} for ${nbPrice} Nano Bucks`}
      >
        <Coins size={14} />
        {state === "done"
          ? "Redeemed!"
          : state === "busy"
            ? "Redeeming…"
            : `${nbPrice.toLocaleString()} NB`}
      </button>
      {message && (
        <p className="text-[11px]" style={{ color: state === "error" ? "#ff8a8a" : accent }} role="status">
          {message}
        </p>
      )}
      {short && state === "idle" && (
        <p className="text-[10px] text-[#b3b3b3]">
          You have {balance?.toLocaleString()} NB
        </p>
      )}
    </div>
  );
}
