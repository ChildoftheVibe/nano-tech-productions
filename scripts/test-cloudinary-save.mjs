// Drives the same save flow the AlbumForm/TrackForm would: hit the admin API
// with realistic payloads (cover URL + audio public_ids), then read the rows
// back and print them to prove data round-trips into Supabase.
//
// Cleans up after itself unless KEEP=1 is set in the env.
//
// Run: node --env-file=.env.local scripts/test-cloudinary-save.mjs

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3737";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function hash(t) {
  return createHash("sha256").update(t).digest("hex");
}

async function adminSession() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hash(token);
  await supabase.from("admin_sessions").insert({
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ip_address: "127.0.0.1",
  });
  return { token, tokenHash };
}

async function adminFetch(token, path, method, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: `ntv_admin_session=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  const { token, tokenHash } = await adminSession();
  let albumId, trackId;
  try {
    const slug = `ntp-test-${Date.now()}`;
    const albumPayload = {
      slug,
      title: "End-to-end Test Album",
      description: "Inserted by test-cloudinary-save.mjs",
      release_date: "2026-05-10",
      cover_image: `https://res.cloudinary.com/dldu0zafs/image/upload/v1/ntp/${slug}/cover/test`,
      background_color: "#393838",
      accent_color: "#3DD6C8",
      spotify_url: "",
      apple_music_url: "",
      youtube_url: "",
      amazon_url: "",
      copyright: "© Nano Tech Productions",
      is_published: false,
    };
    const a = await adminFetch(token, "/api/admin/albums", "POST", albumPayload);
    console.log(`[album POST] status=${a.status}`);
    if (a.status !== 201) { console.log(JSON.stringify(a.body, null, 2)); throw new Error("album insert failed"); }
    albumId = a.body.album.id;
    console.log("[album row]", {
      id: a.body.album.id,
      slug: a.body.album.slug,
      cover_image: a.body.album.cover_image,
      background_color: a.body.album.background_color,
      accent_color: a.body.album.accent_color,
      is_published: a.body.album.is_published,
    });

    const trackPayload = {
      album_id: albumId,
      title: "End-to-end Test Track",
      track_number: 1,
      duration: "3:42",
      price: 1.5,
      audio_url: `https://res.cloudinary.com/dldu0zafs/video/upload/f_mp3,br_320k/ntp/audio/public/${slug}/test`,
      public_audio_id: `${slug}/test`,
      vault_audio_id: `${slug}/test`,
      wav_file_size_mb: 12.34,
      features: ["Artist A", "Artist B"],
      is_downloadable: true,
      is_published: false,
    };
    const t = await adminFetch(token, "/api/admin/tracks", "POST", trackPayload);
    console.log(`[track POST] status=${t.status}`);
    if (t.status !== 201) { console.log(JSON.stringify(t.body, null, 2)); throw new Error("track insert failed"); }
    trackId = t.body.track.id;
    console.log("[track row]", {
      id: t.body.track.id,
      album_id: t.body.track.album_id,
      title: t.body.track.title,
      public_audio_id: t.body.track.public_audio_id,
      vault_audio_id: t.body.track.vault_audio_id,
      wav_file_size_mb: t.body.track.wav_file_size_mb,
      features: t.body.track.features,
      price: t.body.track.price,
    });

    // Confirm the row is independently readable from the DB (proves it's
    // really persisted, not just a passthrough echo).
    const { data: roundTrip, error } = await supabase
      .from("tracks")
      .select("id, album_id, title, public_audio_id, vault_audio_id, features")
      .eq("id", trackId)
      .single();
    if (error) throw error;
    console.log("[track DB read]", roundTrip);
  } finally {
    if (process.env.KEEP !== "1") {
      if (trackId) await supabase.from("tracks").delete().eq("id", trackId);
      if (albumId) await supabase.from("albums").delete().eq("id", albumId);
      console.log("[cleanup] removed test album + track");
    } else {
      console.log("[cleanup] KEEP=1 — left rows in place");
    }
    await supabase.from("admin_sessions").update({ is_revoked: true }).eq("token_hash", tokenHash);
  }
})().catch((e) => { console.error(e); process.exit(1); });
