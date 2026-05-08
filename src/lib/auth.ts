import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "./supabase";

export const ADMIN_COOKIE = "ntv_admin_session";
const SESSION_HOURS = 8;

function adminPasswordHash(): string | null {
  const h = process.env.ADMIN_PASSWORD_HASH;
  return h && h.length > 0 ? h : null;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = adminPasswordHash();
  if (!stored) return false;
  try {
    return await bcrypt.compare(input, stored);
  } catch {
    return false;
  }
}

export async function createSession(ipAddress?: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin.from("admin_sessions").insert({
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: ipAddress ?? null,
  });
  if (error) throw new Error(`session_create_failed: ${error.message}`);
  return token;
}

export async function revokeSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await supabaseAdmin
    .from("admin_sessions")
    .update({ is_revoked: true })
    .eq("token_hash", tokenHash);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function verifySessionToken(token: string): Promise<boolean> {
  if (!token) return false;
  const tokenHash = hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("admin_sessions")
    .select("id, expires_at, is_revoked")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return false;
  if (data.is_revoked) return false;
  if (new Date(data.expires_at).getTime() <= Date.now()) return false;
  return true;
}

export async function setAdminCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function readSessionCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value ?? null;
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
