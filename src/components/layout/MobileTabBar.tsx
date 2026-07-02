"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search, Volume2 } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { usePlayerStore } from "@/store/playerStore";

type Tab = {
  href: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  match: (path: string) => boolean;
};

const TABS: Tab[] = [
  { href: "/", label: "Home", Icon: Home, match: (p) => p === "/" },
  {
    href: "/search",
    label: "Search",
    Icon: Search,
    match: (p) => p.startsWith("/search"),
  },
  {
    href: "/sounds",
    label: "Sounds",
    Icon: Volume2,
    match: (p) => p.startsWith("/sounds"),
  },
  {
    href: "/library",
    label: "The Vault",
    Icon: Library,
    match: (p) => p.startsWith("/library"),
  },
];

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const accentColor =
    currentAlbum?.coverImage && currentAlbum.accentColor
      ? currentAlbum.accentColor
      : "#62f3e4";

  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="flex flex-shrink-0 items-stretch md:hidden"
      style={{
        // 56px of tab content + ≥4px clearance so labels never touch the bottom
        // screen edge; grows for the home-indicator inset on notched phones.
        minHeight: "calc(56px + max(env(safe-area-inset-bottom, 0px), 4px))",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 4px)",
        background: "#090f0e",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        const color = active ? accentColor : "#B3B3B3";
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 transition-colors"
            style={{ color }}
          >
            <Icon size={20} aria-hidden="true" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
