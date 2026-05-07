import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ntp_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD is not set");
  return pw;
}

function expectedToken(): string {
  return createHmac("sha256", adminPassword()).update("admin").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const buf1 = Buffer.from(a);
  const buf2 = Buffer.from(b);
  if (buf1.length !== buf2.length) return false;
  return timingSafeEqual(buf1, buf2);
}

export function verifyPassword(input: string): boolean {
  return safeEqual(input, adminPassword());
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return safeEqual(value, expectedToken());
}

export async function setAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
