import "server-only";
import { supabaseAdmin } from "@/lib/db/admin";
import { askClaude, askClaudeJson, isLlmConfigured } from "./llm";
import {
  createPlaylist,
  isSpotifyPlaylistConfigured,
  isSpotifySearchConfigured,
  searchArtist,
  searchTrack,
} from "./spotify";

/**
 * NTV agent platform — seven autonomous agents run on Vercel cron:
 *
 *  ui-research       Researches casino-game UI best practices → agent_findings
 *  ui-implementer    Turns new findings into a live theme → game_ui_config
 *  quorvo-growth     Audience/marketing analysis from analytics → agent_findings
 *  listener          "Listens" to catalog tracks (metadata + lyrics analysis)
 *                    → track_profiles
 *  similar-artists   Sound profiles → comparable artists (LLM + Spotify)
 *                    → similar_artists
 *  spotify-playlists Similar-artist pools → public Spotify playlists whose
 *                    name/description route listeners to nanotechvibe.com
 *  link-populator    Fills tracks.external_links with per-track streaming URLs
 *
 * Every agent returns a JSON-serializable report and is safe to re-run
 * (idempotent upserts, skips work already done).
 */

export type AgentReport = Record<string, unknown>;
export type AgentRun = () => Promise<AgentReport>;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nanotechvibe.com").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// 1. Casino UI research agent
// ---------------------------------------------------------------------------

async function uiResearch(): Promise<AgentReport> {
  if (!isLlmConfigured()) return { skipped: "ANTHROPIC_API_KEY not set" };
  const { data: applied } = await supabaseAdmin
    .from("agent_findings")
    .select("title")
    .eq("agent", "ui-research")
    .order("created_at", { ascending: false })
    .limit(20);
  const seen = (applied ?? []).map((f) => f.title).join("; ");

  const finding = await askClaudeJson<{ title: string; body: string; config: Record<string, unknown> }>(
    `You are a casino/game UI design researcher for NTV Vault, a luxury dark-themed music
marketplace (page bg #090f0e, panels #1a2120, primary teal #62f3e4, secondary pink #ffabef,
Bungee display font). Its "Nano Tech Games" casino uses a GameShell component that accepts a
theme config: { accent?: string(hex), felt?: string(hex), cardRadius?: number(px),
chipColors?: string[](hex) }. Propose ONE new, concrete, evidence-based UI improvement drawn
from established casino-game UX practice (readability of table felt, chip affordance,
card contrast, celebratory feedback, responsible-gaming clarity). It must stay within the
existing dark luxury aesthetic. Output JSON: {"title": string, "body": string (the research
rationale, 2-3 sentences), "config": partial theme config object embodying the change}.`,
    `Previously proposed (do not repeat): ${seen || "none yet"}`,
  );
  if (!finding) return { error: "llm_no_finding" };

  await supabaseAdmin.from("agent_findings").insert({
    agent: "ui-research",
    title: finding.title,
    body: finding.body,
    data: finding.config ?? {},
  });
  return { finding: finding.title };
}

// ---------------------------------------------------------------------------
// 2. UI implementer agent — applies the oldest unapplied research finding
// ---------------------------------------------------------------------------

async function uiImplementer(): Promise<AgentReport> {
  const { data: finding } = await supabaseAdmin
    .from("agent_findings")
    .select("id, title, data")
    .eq("agent", "ui-research")
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!finding) return { skipped: "no new findings" };

  const { data: current } = await supabaseAdmin
    .from("game_ui_config")
    .select("config")
    .eq("id", 1)
    .maybeSingle();

  // Sanitize: only whitelisted keys, valid hex colors, sane radii.
  const HEX = /^#[0-9a-fA-F]{6}$/;
  const proposal = (finding.data ?? {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...(current?.config ?? {}) };
  if (typeof proposal.accent === "string" && HEX.test(proposal.accent)) next.accent = proposal.accent;
  if (typeof proposal.felt === "string" && HEX.test(proposal.felt)) next.felt = proposal.felt;
  if (typeof proposal.cardRadius === "number" && proposal.cardRadius >= 0 && proposal.cardRadius <= 24) {
    next.cardRadius = Math.round(proposal.cardRadius);
  }
  if (
    Array.isArray(proposal.chipColors) &&
    proposal.chipColors.every((c) => typeof c === "string" && HEX.test(c))
  ) {
    next.chipColors = proposal.chipColors.slice(0, 6);
  }

  await supabaseAdmin
    .from("game_ui_config")
    .update({ config: next, updated_by: `ui-implementer:${finding.id}`, updated_at: new Date().toISOString() })
    .eq("id", 1);
  await supabaseAdmin
    .from("agent_findings")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", finding.id);

  return { applied: finding.title, config: next };
}

// ---------------------------------------------------------------------------
// 3. Quorvo Growth Agent — audience & marketing analysis
// ---------------------------------------------------------------------------

async function quorvoGrowth(): Promise<AgentReport> {
  if (!isLlmConfigured()) return { skipped: "ANTHROPIC_API_KEY not set" };
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [{ data: geo }, { data: events }, { data: topTracks }] = await Promise.all([
    supabaseAdmin
      .from("analytics_geo")
      .select("country, device_type, timezone")
      .gte("created_at", since)
      .limit(500),
    supabaseAdmin
      .from("analytics_events")
      .select("event_type")
      .gte("created_at", since)
      .limit(1000),
    supabaseAdmin
      .from("tracks")
      .select("title, play_count")
      .eq("is_published", true)
      .order("play_count", { ascending: false })
      .limit(10),
  ]);

  const summary = {
    countries: count((geo ?? []).map((g) => g.country ?? "unknown")),
    devices: count((geo ?? []).map((g) => g.device_type ?? "unknown")),
    timezones: count((geo ?? []).map((g) => g.timezone ?? "unknown")),
    events: count((events ?? []).map((e) => e.event_type)),
    topTracks: (topTracks ?? []).map((t) => `${t.title} (${t.play_count})`),
  };

  const analysis = await askClaude(
    `You are Quorvo, the growth agent for NTV Vault (${SITE}), a direct-to-consumer music
marketplace with a gamified Nano Bucks economy. From the weekly analytics snapshot, identify
(1) who the current audience actually is, (2) whether marketing is reaching the right audience
for this catalog, and (3) three specific, low-budget actions (channels, geos, timing, creative
angles) to reach the proper audience. Be concrete and skeptical; note data gaps.`,
    JSON.stringify(summary),
    1500,
  );
  if (!analysis) return { error: "llm_no_analysis" };

  await supabaseAdmin.from("agent_findings").insert({
    agent: "quorvo-growth",
    title: `Weekly growth analysis ${new Date().toISOString().slice(0, 10)}`,
    body: analysis,
    data: summary,
  });
  return { ok: true, sample: { geoRows: geo?.length ?? 0, eventRows: events?.length ?? 0 } };
}

function count(values: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of values) out[v] = (out[v] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]).slice(0, 8));
}

// ---------------------------------------------------------------------------
// 4. Listener agent — builds a sound profile per track
// ---------------------------------------------------------------------------

async function listener(): Promise<AgentReport> {
  if (!isLlmConfigured()) return { skipped: "ANTHROPIC_API_KEY not set" };
  const { data: tracks } = await supabaseAdmin
    .from("tracks")
    .select("id, title, features, credits, lyrics, duration, albums(title, description)")
    .eq("is_published", true)
    .limit(200);
  const { data: profiled } = await supabaseAdmin.from("track_profiles").select("track_id");
  const done = new Set((profiled ?? []).map((p) => p.track_id));
  const todo = (tracks ?? []).filter((t) => !done.has(t.id)).slice(0, 5);
  if (!todo.length) return { skipped: "all tracks profiled" };

  let analyzed = 0;
  for (const t of todo) {
    const album = Array.isArray(t.albums) ? t.albums[0] : t.albums;
    const profile = await askClaudeJson<Record<string, unknown>>(
      `You are a music A&R listener. From a track's metadata and lyrics, produce a sound
profile JSON: {"genres": string[], "moods": string[], "tempoFeel": "slow|mid|upbeat",
"themes": string[], "vocalStyle": string, "similarSoundHints": string[] (descriptors, not
artist names), "confidence": 0-1}. Lyrics are the strongest signal; credits hint at
production style. Be honest with low confidence when metadata is thin.`,
      JSON.stringify({
        title: t.title,
        features: t.features,
        credits: t.credits,
        duration: t.duration,
        album: album?.title,
        albumDescription: album?.description,
        lyrics: (t.lyrics ?? "").slice(0, 4000),
      }),
    );
    if (profile) {
      await supabaseAdmin.from("track_profiles").upsert({
        track_id: t.id,
        profile,
        analyzed_at: new Date().toISOString(),
      });
      analyzed++;
    }
  }
  return { analyzed, remaining: (tracks?.length ?? 0) - done.size - analyzed };
}

// ---------------------------------------------------------------------------
// 5. Similar-artist agent
// ---------------------------------------------------------------------------

async function similarArtists(): Promise<AgentReport> {
  if (!isLlmConfigured()) return { skipped: "ANTHROPIC_API_KEY not set" };
  const { data: profiles } = await supabaseAdmin
    .from("track_profiles")
    .select("track_id, profile, tracks(title)")
    .limit(100);
  const { data: existing } = await supabaseAdmin.from("similar_artists").select("track_id");
  const done = new Set((existing ?? []).map((r) => r.track_id));
  const todo = (profiles ?? []).filter((p) => !done.has(p.track_id)).slice(0, 5);
  if (!todo.length) return { skipped: "no unprocessed profiles" };

  let inserted = 0;
  for (const p of todo) {
    const track = Array.isArray(p.tracks) ? p.tracks[0] : p.tracks;
    const result = await askClaudeJson<{ artists: { name: string; reason: string; score: number }[] }>(
      `Given a track's sound profile, name 5 real, currently-active artists whose sound is
closest. Output JSON {"artists":[{"name": string, "reason": string (one sentence),
"score": 0-1}]}. Prefer artists whose fans actively seek out new independent music.`,
      JSON.stringify({ title: track?.title, profile: p.profile }),
    );
    for (const artist of result?.artists ?? []) {
      const sp = isSpotifySearchConfigured() ? await searchArtist(artist.name) : null;
      await supabaseAdmin.from("similar_artists").insert({
        track_id: p.track_id,
        artist_name: artist.name,
        spotify_artist_id: sp?.id ?? null,
        reason: artist.reason,
        score: artist.score,
      });
      inserted++;
    }
  }
  return { inserted };
}

// ---------------------------------------------------------------------------
// 6. Spotify playlist agent
// ---------------------------------------------------------------------------

async function spotifyPlaylists(): Promise<AgentReport> {
  if (!isSpotifyPlaylistConfigured()) {
    return { skipped: "SPOTIFY_CLIENT_ID/SECRET/REFRESH_TOKEN not set" };
  }
  // Build a playlist mixing our catalog tracks (found on Spotify via the
  // link-populator) with similar artists' top results, so discovery routes
  // back to the platform.
  const { data: tracks } = await supabaseAdmin
    .from("tracks")
    .select("id, title, external_links")
    .eq("is_published", true)
    .limit(100);
  const ours = (tracks ?? []).filter(
    (t) => (t.external_links as Record<string, string>)?.spotify_uri,
  );
  if (!ours.length) return { skipped: "no catalog tracks resolved on Spotify yet (run link-populator)" };

  const { data: similar } = await supabaseAdmin
    .from("similar_artists")
    .select("artist_name")
    .order("created_at", { ascending: false })
    .limit(20);

  const uris: string[] = [];
  for (const t of ours.slice(0, 10)) {
    uris.push((t.external_links as Record<string, string>).spotify_uri);
  }
  for (const s of similar ?? []) {
    const found = await searchTrack(`artist:${s.artist_name}`);
    if (found && !uris.includes(found.uri)) uris.push(found.uri);
    if (uris.length >= 30) break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `NTV Vault Radio · ${stamp}`;
  const description = `Fresh sounds from Nano Tech Productions and artists that match the vibe. Hear it all + earn Nano Bucks at ${SITE}`;

  // Idempotency: one playlist per day.
  const { data: existing } = await supabaseAdmin
    .from("agent_playlists")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (existing) return { skipped: "today's playlist already exists" };

  const playlist = await createPlaylist(name, description, uris);
  if (!playlist) return { error: "spotify_create_failed" };

  await supabaseAdmin.from("agent_playlists").insert({
    spotify_playlist_id: playlist.id,
    name,
    description,
    track_ids: ours.slice(0, 10).map((t) => t.id),
    url: playlist.url,
  });
  return { playlist: playlist.url, trackCount: uris.length };
}

// ---------------------------------------------------------------------------
// 7. Link-populator agent — per-track streaming links
// ---------------------------------------------------------------------------

async function linkPopulator(): Promise<AgentReport> {
  const { data: tracks } = await supabaseAdmin
    .from("tracks")
    .select("id, title, features, external_links, albums(title)")
    .eq("is_published", true)
    .limit(300);
  const todo = (tracks ?? [])
    .filter((t) => !(t.external_links as Record<string, string>)?.vault)
    .slice(0, 10);
  if (!todo.length) return { skipped: "all tracks have links" };

  let updated = 0;
  for (const t of todo) {
    const album = Array.isArray(t.albums) ? t.albums[0] : t.albums;
    const artist = "Nano Tech Productions";
    const q = `${t.title} ${artist}`;
    const links: Record<string, string> = {
      // Canonical link back to the platform (always present).
      vault: album?.title ? `${SITE}/search?q=${encodeURIComponent(t.title)}` : SITE,
      apple_music_search: `https://music.apple.com/search?term=${encodeURIComponent(q)}`,
      youtube_search: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    };
    const sp = isSpotifySearchConfigured() ? await searchTrack(q) : null;
    if (sp) {
      links.spotify = sp.url;
      links.spotify_uri = sp.uri;
    }
    await supabaseAdmin
      .from("tracks")
      .update({ external_links: links })
      .eq("id", t.id);
    updated++;
  }
  return { updated, spotifyEnabled: isSpotifySearchConfigured() };
}

// ---------------------------------------------------------------------------

export const AGENTS: Record<string, AgentRun> = {
  "ui-research": uiResearch,
  "ui-implementer": uiImplementer,
  "quorvo-growth": quorvoGrowth,
  listener,
  "similar-artists": similarArtists,
  "spotify-playlists": spotifyPlaylists,
  "link-populator": linkPopulator,
};
