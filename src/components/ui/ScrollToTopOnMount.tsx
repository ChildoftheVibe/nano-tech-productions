"use client";

import { useEffect, useRef } from "react";

/** Resets the app's scrollable <main> container to the top on mount.
 *
 *  The layout scrolls an inner <main> (overflow-y: auto), not the window, so
 *  Next.js' built-in scroll restoration never touches it — navigating from a
 *  scrolled page (e.g. the portal room) would otherwise land mid-page. Render
 *  this once inside any page that must start at the top.
 */
export function ScrollToTopOnMount() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const main = ref.current?.closest("main");
    if (main) main.scrollTo({ top: 0, left: 0, behavior: "instant" });
    else window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return <span ref={ref} aria-hidden="true" className="hidden" />;
}
