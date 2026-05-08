import type { Track } from "@/types/music";

type CacheEntry = {
  el: HTMLAudioElement;
  url: string;
  pos: number;
};

const cache = new Map<string, CacheEntry>();
const PRELOAD_AHEAD = 2;
const KEEP_BEHIND = 2;

const create = (url: string): HTMLAudioElement => {
  const a = new Audio();
  a.preload = "auto";
  a.src = url;
  a.load();
  return a;
};

const release = (entry: CacheEntry) => {
  try {
    entry.el.pause();
    entry.el.removeAttribute("src");
    entry.el.load();
  } catch {
    /* noop */
  }
};

export function syncAudioCache(queue: Track[], currentIndex: number) {
  if (typeof window === "undefined" || currentIndex < 0) return;

  const wantIds = new Set<string>();
  for (let off = -KEEP_BEHIND; off <= PRELOAD_AHEAD; off++) {
    const t = queue[currentIndex + off];
    if (t?.audioUrl) wantIds.add(t.id);
  }

  for (const [id, entry] of cache) {
    if (!wantIds.has(id)) {
      release(entry);
      cache.delete(id);
    }
  }

  for (let off = 1; off <= PRELOAD_AHEAD; off++) {
    const t = queue[currentIndex + off];
    if (!t?.audioUrl) continue;
    const existing = cache.get(t.id);
    if (existing && existing.url === t.audioUrl) continue;
    if (existing) release(existing);
    cache.set(t.id, { el: create(t.audioUrl), url: t.audioUrl, pos: off });
  }
}

export function clearAudioCache() {
  for (const entry of cache.values()) release(entry);
  cache.clear();
}
