import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "album_view",
  "album_view_end",
  "play_start",
  "play_progress",
  "track_skip",
  "full_listen",
  "track_pause",
  "track_seek",
  "purchase_intent",
  "purchase_complete",
  "search",
  "swipe",
  "scroll_depth",
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Body = {
  session_id?: unknown;
  event_type?: unknown;
  track_id?: unknown;
  album_id?: unknown;
  position_seconds?: unknown;
  duration_seconds?: unknown;
  percent?: unknown;
  query?: unknown;
  metadata?: unknown;
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function uuidOrNull(v: unknown): string | null {
  return typeof v === "string" && UUID_RE.test(v) ? v : null;
}

export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  const eventType = typeof body.event_type === "string" ? body.event_type : "";

  if (!sessionId || !eventType || !ALLOWED_EVENTS.has(eventType)) {
    return Response.json({ error: "invalid_event" }, { status: 400 });
  }

  const trackId = uuidOrNull(body.track_id);
  const albumId = uuidOrNull(body.album_id);
  const position = num(body.position_seconds);
  const duration = num(body.duration_seconds);
  const percent = num(body.percent);
  const query = typeof body.query === "string" ? body.query.slice(0, 500) : null;

  // Cap metadata to avoid pathological writes.
  let metadata: unknown = null;
  if (body.metadata && typeof body.metadata === "object") {
    const json = JSON.stringify(body.metadata);
    if (json.length <= 4096) metadata = body.metadata;
  }

  const { error } = await supabaseAdmin.from("analytics_events").insert({
    session_id: sessionId,
    event_type: eventType,
    track_id: trackId,
    album_id: albumId,
    position_seconds: position,
    duration_seconds: duration,
    percent,
    query,
    metadata,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Bump session totals on completion-style events.
  if (
    (eventType === "full_listen" || eventType === "track_skip") &&
    duration !== null &&
    position !== null
  ) {
    const seconds = Math.max(
      0,
      Math.round(eventType === "full_listen" ? duration : position),
    );
    if (seconds > 0) {
      await supabaseAdmin.rpc("increment_listen_seconds", {
        p_session_id: sessionId,
        p_seconds: seconds,
      });
    }
  }

  return Response.json({ ok: true });
}
