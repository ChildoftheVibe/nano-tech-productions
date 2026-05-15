"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    const id = Sentry.captureException(error) ?? null;
    const t = setTimeout(() => setEventId(id), 0);
    return () => clearTimeout(t);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#393838", color: "#fff", fontFamily: "monospace" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "clamp(72px,16vw,140px)",
              fontWeight: 800,
              color: "#EB41DF",
              lineHeight: 1,
            }}
            aria-hidden
          >
            ERR
          </div>
          <h1 style={{ marginTop: "1.5rem", fontSize: "1.25rem", fontWeight: 700 }}>
            A critical error occurred
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#B3B3B3", maxWidth: 400 }}>
            The application encountered an unrecoverable error.
          </p>
          {eventId && (
            <p style={{ marginTop: "1rem", fontSize: "0.6875rem", color: "rgba(255,255,255,0.4)" }}>
              Error reference: {eventId}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "2rem",
              background: "#3DD6C8",
              color: "#000",
              border: "none",
              borderRadius: 9999,
              padding: "0.625rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
