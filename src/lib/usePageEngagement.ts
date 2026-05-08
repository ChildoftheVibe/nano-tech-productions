"use client";

import { useEffect, useRef } from "react";
import { trackScrollDepth } from "./analytics";

const DEPTH_BUCKETS = [25, 50, 75, 90, 100];

// Tracks scroll depth (highest bucket reached) and total time-on-page.
// Pass an optional onUnmount(msSpent) to receive the duration.
export function usePageEngagement(
  page: string,
  onUnmount?: (msSpent: number) => void,
) {
  const startedAt = useRef<number>(0);
  const reportedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    startedAt.current = Date.now();
    reportedRef.current = new Set();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
      for (const bucket of DEPTH_BUCKETS) {
        if (pct >= bucket && !reportedRef.current.has(bucket)) {
          reportedRef.current.add(bucket);
          trackScrollDepth(page, bucket);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      const ms = Date.now() - startedAt.current;
      onUnmount?.(ms);
    };
  }, [page, onUnmount]);
}
