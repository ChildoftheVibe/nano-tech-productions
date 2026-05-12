"use client";

import { useEffect, useState } from "react";

/**
 * Lives in the root layout and watches the service worker registration for
 * a waiting (installed-but-not-yet-active) update. When one appears we
 * surface a subtle teal toast above the player bar; tapping it posts
 * `SKIP_WAITING` to the waiting SW, which then activates and claims this
 * page. The `controllerchange` listener reloads as soon as the new SW
 * takes over so the user gets the just-deployed code on the next paint.
 *
 * The toast is the user-visible counterpart to `skipWaiting: false` in
 * sw.ts — without an explicit prompt, an in-flight tab would otherwise
 * stay on the old SW until every tab closes.
 */
export function SWUpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    const attach = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration || cancelled) return;

      // Already-waiting SW (e.g. user navigated back to a tab where an
      // update finished installing while they were away).
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaiting(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const sw = registration.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (
            sw.state === "installed" &&
            navigator.serviceWorker.controller &&
            !cancelled
          ) {
            setWaiting(sw);
          }
        });
      });
    };

    attach();

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  if (!waiting) return null;

  return (
    <button
      type="button"
      onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
      // PlayerBar is 90px tall and pinned to the viewport bottom; sit just
      // above it.
      style={{ bottom: 100 }}
      className="fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-[#3DD6C8]/50 bg-black/85 px-4 py-2 text-sm font-medium text-[#3DD6C8] shadow-lg backdrop-blur-sm transition-colors hover:bg-black hover:text-white"
      aria-label="Reload to apply the latest update"
    >
      Update available — tap to refresh
    </button>
  );
}
