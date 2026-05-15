"use client";

import { ErrorBoundary } from "@sentry/nextjs";
import type { ReactElement, ReactNode } from "react";

type Props = {
  children: ReactNode;
  fallback?: ReactElement;
};

const DEFAULT_FALLBACK = (
  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-sm text-white/60">
    <span>Something went wrong. Please refresh the page.</span>
  </div>
);

export function SentryErrorBoundary({ children, fallback }: Props) {
  return (
    <ErrorBoundary fallback={fallback ?? DEFAULT_FALLBACK}>
      {children}
    </ErrorBoundary>
  );
}
