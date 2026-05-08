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
  ],
};

const ADMIN_COOKIE = "ntv_admin_session";

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
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
  const ip = clientIp(req);

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

  return NextResponse.next();
}
