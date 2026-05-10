// One-shot test: create an admin session, probe /api/admin/cloudinary-sign for
// each folder shape, then push a tiny payload to Cloudinary using the returned
// signature to prove the signature is accepted end-to-end.
//
// Run: node --env-file=.env.local scripts/test-cloudinary-flow.mjs

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";

const BASE = process.env.BASE_URL ?? "http://localhost:3737";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

function hashToken(t) {
  return createHash("sha256").update(t).digest("hex");
}

async function createSession() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("admin_sessions")
    .insert({ token_hash: tokenHash, expires_at: expiresAt, ip_address: "127.0.0.1" });
  if (error) throw new Error(`session insert failed: ${error.message}`);
  return { token, tokenHash };
}

async function revokeSession(tokenHash) {
  await supabase.from("admin_sessions").update({ is_revoked: true }).eq("token_hash", tokenHash);
}

async function sign(token, body) {
  const res = await fetch(`${BASE}/api/admin/cloudinary-sign`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `ntv_admin_session=${token}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Tiny 1x1 transparent PNG (base64) for the image upload test.
const PNG_1X1 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Zy+x4QAAAAASUVORK5CYII=";

// Minimal valid 16-bit mono PCM WAV: ~0.05s of silence at 8kHz.
function tinyWav() {
  const sampleRate = 8000;
  const numSamples = 400; // 50ms
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);          // PCM
  buf.writeUInt16LE(1, 22);          // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);          // block align
  buf.writeUInt16LE(16, 34);         // bits per sample
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}

async function actuallyUpload(sig, kind = "image") {
  const fd = new FormData();
  let bin, mime, name;
  if (kind === "wav") {
    bin = tinyWav();
    mime = "audio/wav";
    name = "test.wav";
  } else {
    bin = Buffer.from(PNG_1X1, "base64");
    mime = "image/png";
    name = "test.png";
  }
  fd.append("file", new Blob([bin], { type: mime }), name);
  fd.append("api_key", sig.apiKey);
  fd.append("timestamp", String(sig.timestamp));
  fd.append("signature", sig.signature);
  fd.append("folder", sig.folder);
  if (sig.type === "authenticated") fd.append("type", "authenticated");
  const url = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`;
  const res = await fetch(url, { method: "POST", body: fd });
  const json = await res.json();
  return { status: res.status, public_id: json.public_id, secure_url: json.secure_url, error: json.error };
}

async function deleteAsset(publicId, resourceType, type) {
  // Use Cloudinary admin API directly via signed destroy call.
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = type === "authenticated"
    ? `public_id=${publicId}&timestamp=${timestamp}&type=authenticated`
    : `public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(`${params}${apiSecret}`).digest("hex");
  const fd = new FormData();
  fd.append("public_id", publicId);
  fd.append("timestamp", String(timestamp));
  fd.append("api_key", apiKey);
  fd.append("signature", signature);
  if (type === "authenticated") fd.append("type", "authenticated");
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
  const res = await fetch(url, { method: "POST", body: fd });
  return res.json();
}

(async () => {
  const { token, tokenHash } = await createSession();
  console.log("[setup] admin session created");
  try {
    const cases = [
      { name: "Album cover (per-slug)", body: { folder: "ntp/test-album/cover", resourceType: "image" } },
      { name: "Album cover (legacy)",   body: { folder: "ntp/images/covers",     resourceType: "image" } },
      { name: "Public audio",           body: { folder: "ntp/audio/public/test-album", resourceType: "video" } },
      { name: "Vault audio",            body: { folder: "ntp/audio/vault/test-album",  resourceType: "video" } },
      { name: "Disallowed folder",      body: { folder: "ntp/evil",              resourceType: "image" } },
      { name: "Disallowed slug",        body: { folder: "ntp/Bad Slug!/cover",  resourceType: "image" } },
    ];

    for (const c of cases) {
      const r = await sign(token, c.body);
      const ok = r.status === 200;
      const tag = ok ? "OK " : "ERR";
      console.log(`[sign] ${tag} ${c.name.padEnd(28)} → ${r.status} ${ok
        ? `folder=${r.body.folder} type=${r.body.type}`
        : JSON.stringify(r.body)}`);
    }

    // Try one real upload through the per-slug cover folder to prove the
    // signature works on Cloudinary's side.
    const r = await sign(token, { folder: "ntp/test-album/cover", resourceType: "image" });
    if (r.status === 200) {
      const up = await actuallyUpload(r.body);
      console.log(`[upload] cover → status=${up.status} public_id=${up.public_id ?? "(none)"} url=${up.secure_url ?? "(none)"}${up.error ? ` error=${JSON.stringify(up.error)}` : ""}`);
      if (up.public_id) {
        const del = await deleteAsset(up.public_id, "image", "upload");
        console.log(`[cleanup] destroy → ${JSON.stringify(del)}`);
      }
    }

    // Public audio upload (MP3/WAV) — confirms upload signature for audio.
    const p = await sign(token, { folder: "ntp/audio/public/test-album", resourceType: "video" });
    if (p.status === 200) {
      const up = await actuallyUpload(p.body, "wav");
      console.log(`[upload] public-audio → status=${up.status} public_id=${up.public_id ?? "(none)"}${up.error ? ` error=${JSON.stringify(up.error)}` : ""}`);
      if (up.public_id) {
        const del = await deleteAsset(up.public_id, "video", "upload");
        console.log(`[cleanup] destroy → ${JSON.stringify(del)}`);
      }
    }

    // Vault upload — confirms type=authenticated path also works.
    const v = await sign(token, { folder: "ntp/audio/vault/test-album", resourceType: "video" });
    if (v.status === 200) {
      const up = await actuallyUpload(v.body, "wav");
      console.log(`[upload] vault → status=${up.status} public_id=${up.public_id ?? "(none)"} url=${up.secure_url ?? "(none)"}${up.error ? ` error=${JSON.stringify(up.error)}` : ""}`);
      if (up.public_id) {
        const del = await deleteAsset(up.public_id, "video", "authenticated");
        console.log(`[cleanup] destroy → ${JSON.stringify(del)}`);
      }
    }
  } finally {
    await revokeSession(tokenHash);
    console.log("[teardown] admin session revoked");
  }
})().catch((e) => { console.error(e); process.exit(1); });
