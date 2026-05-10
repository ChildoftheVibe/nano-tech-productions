import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
  /** Renders inside a parent container; pass `compact` to drop vertical padding. */
  compact?: boolean;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  actionHref,
  compact = false,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-md border border-white/10 bg-white/[0.02] text-center ${
        compact ? "px-4 py-6" : "px-6 py-12"
      } ${className}`}
      role="status"
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-[#3DD6C8]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-bold text-white md:text-base">{title}</h3>
      {message ? (
        <p className="mt-1 max-w-md text-xs text-[#B3B3B3] md:text-sm">
          {message}
        </p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold text-black transition-transform hover:scale-105"
          style={{ background: "#3DD6C8" }}
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
