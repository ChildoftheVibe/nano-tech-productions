"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initPostHog,
  trackPageView,
  getSessionId,
  getAnonymousId,
  deviceType,
} from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const lastPath = useRef<string | null>(null);
  const geoSent = useRef(false);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (geoSent.current) return;
    geoSent.current = true;

    const body = JSON.stringify({
      session_id: getSessionId(),
      anon_id: getAnonymousId(),
      device_type: deviceType(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      timezone:
        typeof Intl !== "undefined"
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : null,
    });

    try {
      if ("sendBeacon" in navigator) {
        const blob = new Blob([body], { type: "application/json" });
        const ok = navigator.sendBeacon("/api/analytics/geo", blob);
        if (ok) return;
      }
      void fetch("/api/analytics/geo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      });
    } catch {
      // best-effort
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = search?.toString() ?? "";
    const fullPath = qs ? `${pathname}?${qs}` : pathname;
    if (lastPath.current === fullPath) return;
    lastPath.current = fullPath;
    trackPageView(fullPath);
  }, [pathname, search]);

  return <>{children}</>;
}
