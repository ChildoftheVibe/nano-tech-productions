"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search, Users, Volume2, Star, type LucideIcon } from "lucide-react";
import type { Album } from "@/types/music";
import { usePlayerStore } from "@/store/playerStore";

const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "The Vault", icon: Library },
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
  const currentAlbum = usePlayerStore((s) => s.currentAlbum);
  const accentColor =
    currentAlbum?.coverImage && currentAlbum.accentColor
      ? currentAlbum.accentColor
      : "#62f3e4";

  const navLink = (href: string, label: string, Icon: LucideIcon) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          borderRadius: "8px",
          padding: "13px 16px 13px 14px",
          fontSize: "14px",
          fontWeight: active ? 600 : 400,
          textDecoration: "none",
          transition: "background 150ms ease-out, color 150ms ease-out",
          background: active ? `${accentColor}14` : "transparent",
          color: active ? accentColor : "#8a9e9a",
          borderLeft: active ? `3px solid ${accentColor}` : "3px solid transparent",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLAnchorElement).style.color = "#dde4e2";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "#8a9e9a";
          }
        }}
      >
        <Icon
          size={18}
          aria-hidden="true"
          style={{ color: active ? accentColor : "currentColor", flexShrink: 0 }}
        />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <aside
      aria-label="Sidebar"
      className="hidden md:flex flex-col flex-shrink-0"
      style={{
        width: 260,
        background: "linear-gradient(180deg, #0e1514 0%, #090f0e 40%)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "32px 20px 28px" }}>
        <Link
          href="/"
          aria-label="NTV Vault home"
          className="ntv-logo font-[family-name:var(--font-bungee)] leading-none"
          style={{ fontSize: 22, letterSpacing: "-0.03em", color: accentColor, textDecoration: "none" }}
        >
          NTV
        </Link>
      </div>

      {/* Primary nav */}
      <nav
        aria-label="Primary"
        style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {primaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Section label */}
      <div style={{ padding: "32px 20px 10px" }}>
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "rgba(138,158,154,0.5)",
            margin: 0,
          }}
        >
          Personal
        </p>
      </div>

      {/* Secondary nav */}
      <nav
        aria-label="Personal"
        style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {secondaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom brand panel */}
      <div
        style={{
          margin: "0 10px 16px",
          borderRadius: 8,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #62f3e4 0%, #ffabef 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <span
              className="font-[family-name:var(--font-bungee)]"
              style={{ fontSize: 10, fontWeight: 700, color: "#003733" }}
            >
              NTV
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: "#dde4e2", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Nano Tech Vibe
            </p>
            <p
              style={{
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 10,
                color: "#62f3e4",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: 0,
              }}
            >
              The Vault
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: 11, color: "#bbcac6" }}>
          <Link href="/privacy" style={{ color: "inherit", textDecoration: "none" }} className="hover:text-white transition-colors">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" style={{ color: "inherit", textDecoration: "none" }} className="hover:text-white transition-colors">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/admin" style={{ color: "inherit", textDecoration: "none" }} className="hover:text-white transition-colors">Admin</Link>
        </div>
        <p style={{ marginTop: 4, fontSize: 10, color: "rgba(187,202,198,0.5)" }}>© 2026 Nano Tech Productions</p>
      </div>
    </aside>
  );
}
