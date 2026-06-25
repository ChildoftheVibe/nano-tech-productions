"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalRouteError({ error, reset }: Props) {
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    const id = Sentry.captureException(error) ?? null;
    const t = setTimeout(() => setEventId(id), 0);
    return () => clearTimeout(t);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="font-mono text-[#ffabef]"
        style={{
          fontSize: "clamp(72px, 16vw, 160px)",
          fontWeight: 800,
          letterSpacing: "0.04em",
          lineHeight: 1,
          textShadow:
            "0 0 18px rgba(255,171,239,0.45), 0 0 32px rgba(255,171,239,0.2)",
        }}
        aria-hidden
      >
        ERR
      </div>
      <h1 className="mt-6 text-xl font-bold text-white md:text-2xl">
        Something went wrong in the system
      </h1>
      <p className="mt-2 max-w-md text-sm text-[#B3B3B3]">
        We hit an unexpected error. You can try again, or head back to the
        vault.
      </p>
      {isDev ? (
        <pre
          className="mt-6 max-w-2xl overflow-auto rounded border border-white/10 bg-black/40 p-4 text-left font-mono text-[11px] text-white/70"
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {error.message}
          {error.stack ? `\n\n${error.stack}` : ""}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-white/40">
          {eventId
            ? `Error reference: ${eventId}`
            : error.digest
              ? `ref: ${error.digest}`
              : null}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-bold text-black transition-transform hover:scale-105"
          style={{ background: "#62f3e4" }}
        >
          Try Again
        </button>
        <Link
          href="/"
          className="ntv-btn inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
