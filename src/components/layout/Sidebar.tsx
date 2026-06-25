"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search, Users, Volume2, Star } from "lucide-react";
import type { Album } from "@/types/music";

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Your Library", icon: Library },
  { href: "/sounds", label: "Sounds", icon: Volume2 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/artists", label: "Artists", icon: Users },
];

const secondaryNav = [
  { href: "/fan-club/login", label: "Nano Techians", icon: Star },
];

type Props = {
  initialAlbums: Album[];
};

export function Sidebar({ initialAlbums: _ }: Props) {
  const pathname = usePathname();

  const navLink = (href: string, label: string, Icon: React.ElementType) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150 ${
          active
            ? "bg-[#62f3e4]/[0.11] text-[#62f3e4]"
            : "text-[#bbcac6] hover:bg-white/[0.05] hover:text-[#dde4e2]"
        }`}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      aria-label="Sidebar"
      className="hidden flex-shrink-0 flex-col md:flex"
      style={{ width: 260, background: "#111918", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Brand */}
      <div className="flex-shrink-0 px-5 pt-7 pb-6">
        <Link
          href="/"
          aria-label="NTV Vault home"
          className="ntv-logo font-[family-name:var(--font-bungee)] text-[22px] tracking-tighter text-[#62f3e4] leading-none"
        >
          NTV
        </Link>
      </div>

      {/* Primary nav */}
      <nav aria-label="Primary" className="flex-shrink-0 px-3 flex flex-col gap-0.5">
        {primaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Secondary nav */}
      <div className="flex-shrink-0 px-5 pt-6 pb-2">
        <p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-[#bbcac6]/40">
          Personal Space
        </p>
      </div>
      <nav aria-label="Personal" className="flex-shrink-0 px-3 flex flex-col gap-0.5">
        {secondaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom glass brand panel */}
      <div className="glass-panel mx-2 mb-3 flex-shrink-0 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
            style={{ background: "linear-gradient(135deg, #62f3e4 0%, #ffabef 100%)" }}
            aria-hidden="true"
          >
            <span className="font-[family-name:var(--font-bungee)] text-xs font-bold text-[#003733]">NTV</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#dde4e2]">Nano Tech Vibe</p>
            <p className="font-[family-name:var(--font-geist-mono)] text-[10px] text-[#62f3e4] uppercase tracking-widest">The Vault</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#bbcac6]">
          <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-white transition-colors duration-150">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/admin" className="hover:text-white transition-colors duration-150">Admin</Link>
        </div>
        <p className="mt-1 text-[10px] text-[#bbcac6]/50">© 2026 Nano Tech Productions</p>
      </div>
    </aside>
  );
}
