"use client";

import { useEffect, useRef, useState } from "react";
import { logError } from "@/lib/logger";
import { Download, Lock, Pause, Play, ScrollText } from "lucide-react";

export type VaultTrack = {
  id: string;
  title: string;
  trackNumber: number;
  albumTitle: string;
  checksum: string | null;
  sizeMb: number | null;
  uploadedAt: string;
  downloadCount: number;
  lastAccessedAt: string | null;
  accessCount: number;
};

type LogEntry = {
  id: string;
  event_type: string;
  ip_address: string | null;
  performed_by: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
};

const fmtChecksum = (c: string | null) => {
  if (!c) return "—";
  return c.length > 16 ? `${c.slice(0, 8)}…${c.slice(-8)}` : c;
};

export function VaultClient({ tracks }: { tracks: VaultTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [logsForTrackId, setLogsForTrackId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Auto-revoke the URL from memory once playback finishes.
      audio.removeAttribute("src");
      audio.load();
      setActiveTrackId(null);
      setActiveTitle("");
      setIsPlaying(false);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Defensive: clear src when component unmounts.
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (!audio) return;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    };
  }, []);

  const handlePreview = (track: VaultTrack) => {
    if (busyId) return;
    setPlayerError(null);
    setAutoplayBlocked(false);
    const audio = audioRef.current;
    if (!audio) return;

    // Point the audio element at our proxy endpoint. It 302-redirects to the
    // signed Cloudinary URL — set src and call play() synchronously here so
    // the user-gesture token from the click survives autoplay-policy checks.
    const streamUrl = `/api/admin/wav/${track.id}/stream`;
    console.log("[Vault] preview start", { trackId: track.id, streamUrl });

    // Attach the error listener BEFORE load() so a synchronous load failure
    // can't race the listener registration. MediaError codes:
    //   1 ABORTED  2 NETWORK  3 DECODE  4 SRC_NOT_SUPPORTED
    const onError = () => {
      const code = audio.error?.code;
      const message = audio.error?.message;
      const currentSrc = audio.currentSrc;
      logError(new Error("[Vault] audio error"), { code, message, currentSrc });
      setPlayerError(
        `Preview failed (MediaError ${code ?? "?"}). Check console + Network for /api/admin/wav/${track.id}/stream.`,
      );
    };
    audio.addEventListener("error", onError, { once: true });

    audio.src = streamUrl;
    audio.load();
    setActiveTrackId(track.id);
    setActiveTitle(`${track.albumTitle} — ${track.title}`);

    const result = audio.play();
    if (result && typeof result.catch === "function") {
      result.catch((err: unknown) => {
        // Even with the proxy approach, some browsers (Safari) want every
        // play() to follow a fresh tap. Fall back to surfacing the inline
        // hint so the user can press play in the visible controls.
        console.warn("[Vault] audio.play() rejected:", err);
        setAutoplayBlocked(true);
      });
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setActiveTrackId(null);
    setActiveTitle("");
    setIsPlaying(false);
    setAutoplayBlocked(false);
    setPlayerError(null);
  };

  const handleDownload = async (track: VaultTrack) => {
    if (busyId) return;
    setBusyId(track.id);
    try {
      const res = await fetch(`/api/admin/wav/download/${track.id}`, { cache: "no-store" });
      if (!res.ok) {
        alert("Vault download failed.");
        return;
      }
      const { url } = (await res.json()) as { url: string };
      // Trigger browser download then drop the URL.
      window.location.href = url;
    } finally {
      setBusyId(null);
    }
  };

  const handleViewLog = async (track: VaultTrack) => {
    if (logsForTrackId === track.id) {
      setLogsForTrackId(null);
      setLogs([]);
      return;
    }
    setLogsForTrackId(track.id);
    setLogs([]);
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?trackId=${track.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = (await res.json()) as { entries: LogEntry[] };
        setLogs(json.entries);
      }
    } finally {
      setLogsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Lock className="text-[#EB41DF]" />
        <h1 className="font-mono text-2xl font-bold tracking-wider">MASTER VAULT</h1>
      </div>

      <div className="mb-6 rounded border border-[#EB41DF]/40 bg-[#EB41DF]/10 p-4 text-sm text-white/90">
        These are your irreplaceable master files. All access is logged.
      </div>

      <div className="mb-6 rounded border border-white/10 bg-black/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-white/60">Vault Player</div>
            <div className="truncate text-sm font-medium">
              {activeTitle || "Nothing loaded"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <audio ref={audioRef} preload="metadata" controls className="h-8" />
            {activeTrackId ? (
              <button
                onClick={handleStop}
                className="rounded border border-white/20 px-3 py-1 text-xs hover:bg-white/5"
              >
                Stop
              </button>
            ) : null}
          </div>
        </div>
        {autoplayBlocked ? (
          <p className="mt-2 text-xs text-[#3DD6C8]">
            Browser blocked autoplay — press play on the controls above to start streaming.
          </p>
        ) : null}
        {playerError ? (
          <p className="mt-2 text-xs text-red-300">{playerError}</p>
        ) : null}
      </div>

      {tracks.length === 0 ? (
        <p className="text-white/60">No vault files uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-white/10">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-black/40 text-left text-[11px] uppercase tracking-wider text-white/60">
              <tr>
                <th className="px-3 py-2">Album</th>
                <th className="px-3 py-2">Track</th>
                <th className="px-3 py-2">WAV Size</th>
                <th className="px-3 py-2">Checksum</th>
                <th className="px-3 py-2">Uploaded</th>
                <th className="px-3 py-2">Last Accessed</th>
                <th className="px-3 py-2">Access Count</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => (
                <tr key={t.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-3 text-white/80">{t.albumTitle}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-white/50">#{t.trackNumber}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {t.sizeMb ? `${t.sizeMb.toFixed(1)} MB` : "—"}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-white/70">
                    {fmtChecksum(t.checksum)}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/70">{fmtDate(t.uploadedAt)}</td>
                  <td className="px-3 py-3 text-xs text-white/70">
                    {fmtDate(t.lastAccessedAt)}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs">{t.accessCount}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => handlePreview(t)}
                        disabled={busyId === t.id}
                        className="flex items-center gap-1 rounded border border-[#3DD6C8]/40 px-2 py-1 text-xs text-[#3DD6C8] hover:bg-[#3DD6C8]/10 disabled:opacity-50"
                      >
                        {activeTrackId === t.id && isPlaying ? (
                          <Pause size={12} />
                        ) : (
                          <Play size={12} />
                        )}
                        Preview
                      </button>
                      <button
                        onClick={() => handleDownload(t)}
                        disabled={busyId === t.id}
                        className="flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/5 disabled:opacity-50"
                      >
                        <Download size={12} />
                        Download
                      </button>
                      <button
                        onClick={() => handleViewLog(t)}
                        className="flex items-center gap-1 rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/5"
                      >
                        <ScrollText size={12} />
                        Log
                      </button>
                    </div>
                    {logsForTrackId === t.id ? (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded border border-white/10 bg-black/40 p-2 text-[11px] text-white/80">
                        {logsLoading ? (
                          <div>Loading…</div>
                        ) : logs.length === 0 ? (
                          <div className="text-white/50">No log entries.</div>
                        ) : (
                          <ul className="space-y-1">
                            {logs.map((l) => (
                              <li key={l.id} className="font-mono">
                                <span className="text-[#3DD6C8]">{l.event_type}</span>{" "}
                                {fmtDate(l.created_at)}{" "}
                                <span className="text-white/50">{l.ip_address ?? "—"}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
