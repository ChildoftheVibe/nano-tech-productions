import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/paypal/:path*",
    "/api/download/:path*",
    "/api/tracks/:path*",
    "/api/playlist/:path*",
    "/api/albums/:path*",
    "/fan-club/:path*",
    "/api/fan-club/:path*",
  ],
};

const PUBLIC_FAN_CLUB_PATHS = new Set([
  "/fan-club/login",
  "/fan-club/register",
]);

const ADMIN_COOKIE = "ntv_admin_session";

type ClientContext = {
  ip: string;
  country: string | null;
  cfRay: string | null;
};

function clientContext(req: NextRequest): ClientContext {
  // Cloudflare sets CF-Connecting-IP with the true visitor IP. When the request
  // arrives directly at the origin (bypassing CF), this header will be absent
  // and we fall back to XFF/x-real-ip so dev and break-glass paths still work.
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) {
    return {
      ip: cfIp,
      country: req.headers.get("cf-ipcountry"),
      cfRay: req.headers.get("cf-ray"),
    };
  }
  const xff = req.headers.get("x-forwarded-for");
  const ip = xff
    ? xff.split(",")[0].trim()
    : req.headers.get("x-real-ip") ?? "unknown";
  return { ip, country: null, cfRay: null };
}

async function logDirectServerAccess(req: NextRequest, ctx: ClientContext) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/audit_log`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        event_type: "direct_server_access_attempt",
        performed_by: ctx.ip,
        ip_address: ctx.ip,
        user_agent: req.headers.get("user-agent") ?? null,
        metadata: {
          path: req.nextUrl.pathname,
          host: req.headers.get("host") ?? null,
          country: ctx.country,
        },
      }),
    });
  } catch {
    // Best-effort. Never fail a request because audit logging fell over.
  }
}

async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number,
): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return true; // fail-open if not configured (dev)

  try {
    const res = await fetch(`${url}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_identifier: identifier,
        p_action: action,
        p_max_attempts: maxAttempts,
        p_window_minutes: windowMinutes,
      }),
    });
    if (!res.ok) return true;
    const allowed = await res.json();
    return allowed === true;
  } catch {
    return true;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const ctx = clientContext(req);
  const ip = ctx.ip;

  // In production, every request should arrive via Cloudflare and carry CF-Ray.
  // A missing CF-Ray means someone hit the origin IP directly — log it so we
  // can spot scanning/recon. We don't block (would break health checks) but
  // we want a paper trail.
  if (!ctx.cfRay && process.env.NODE_ENV === "production") {
    // Don't await — this is fire-and-forget telemetry.
    void logDirectServerAccess(req, ctx);
  }

  // Per-IP rate limiting on /api routes.
  if (pathname.startsWith("/api/")) {
    let action = "api_general";
    let max = 100;
    let win = 1;

    if (pathname.startsWith("/api/paypal/")) {
      action = "api_paypal";
      max = 10;
    } else if (pathname.startsWith("/api/download/")) {
      action = "api_download";
      max = 5;
    } else if (pathname.startsWith("/api/admin/auth/login")) {
      action = "api_admin_login";
      max = 5;
      win = 15;
    } else if (pathname.startsWith("/api/fan-club/")) {
      action = "api_fan_club";
      max = 60;
    }

    const allowed = await checkRateLimit(ip, action, max, win);
    if (!allowed) {
      return new NextResponse(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "retry-after": String(win * 60),
        },
      });
    }
  }

  // Gate /admin/* (excluding /admin/login and /api/admin/auth/*).
  const isAdminPage =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");
  const isAdminApi =
    pathname.startsWith("/api/admin") && !pathname.startsWith("/api/admin/auth");

  if (isAdminPage || isAdminApi) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value;
    if (!token) {
      if (isAdminApi) {
        return new NextResponse(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Real verification (DB lookup) happens in the admin layout / route. The
    // proxy is the cheap presence check; deep verify is fail-closed there.
  }

  // ── Fan Club auth guard ──────────────────────────────────────────────────
  // Public fan-club pages (login / register / OAuth callback) pass through.
  // All other /fan-club/* routes require a valid Supabase session.
  if (
    pathname.startsWith("/fan-club") &&
    !pathname.startsWith("/fan-club/auth/") &&
    !PUBLIC_FAN_CLUB_PATHS.has(pathname)
  ) {
    let fanRes = NextResponse.next({
      request: { headers: req.headers },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value),
            );
            fanRes = NextResponse.next({ request: { headers: req.headers } });
            cookiesToSet.forEach(({ name, value, options }) =>
              fanRes.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/fan-club/login", req.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    fanRes.headers.set("x-client-ip", ip);
    if (ctx.country) fanRes.headers.set("x-client-country", ctx.country);
    return fanRes;
  }

  // Forward the resolved client IP and country to downstream handlers so they
  // don't have to re-parse Cloudflare headers themselves.
  const res = NextResponse.next();
  res.headers.set("x-client-ip", ip);
  if (ctx.country) res.headers.set("x-client-country", ctx.country);
  return res;
}
