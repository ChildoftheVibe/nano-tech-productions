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
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderRadius: "8px",
          padding: "11px 16px",
          fontSize: "14px",
          fontWeight: active ? 600 : 500,
          textDecoration: "none",
          transition: "background 150ms ease-out, color 150ms ease-out",
          background: active ? "#242b2a" : "transparent",
          color: active ? "#dde4e2" : "#bbcac6",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLAnchorElement).style.background = "#1e2726";
            (e.currentTarget as HTMLAnchorElement).style.color = "#dde4e2";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            (e.currentTarget as HTMLAnchorElement).style.color = "#bbcac6";
          }
        }}
      >
        <Icon
          size={18}
          aria-hidden="true"
          style={{ color: active ? "#62f3e4" : "currentColor", flexShrink: 0 }}
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
        background: "#1a2120",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Brand */}
      <div style={{ padding: "28px 20px 24px" }}>
        <Link
          href="/"
          aria-label="NTV Vault home"
          className="ntv-logo font-[family-name:var(--font-bungee)] leading-none"
          style={{ fontSize: 22, letterSpacing: "-0.03em", color: "#62f3e4", textDecoration: "none" }}
        >
          NTV
        </Link>
      </div>

      {/* Primary nav */}
      <nav
        aria-label="Primary"
        style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {primaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Section label */}
      <div style={{ padding: "28px 20px 10px" }}>
        <p
          style={{
            fontFamily: "var(--font-geist-mono), monospace",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.22em",
            color: "rgba(187,202,198,0.45)",
            margin: 0,
          }}
        >
          Personal Space
        </p>
      </div>

      {/* Secondary nav */}
      <nav
        aria-label="Personal"
        style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 2 }}
      >
        {secondaryNav.map(({ href, label, icon: Icon }) => navLink(href, label, Icon))}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom brand panel */}
      <div
        style={{
          margin: "0 8px 12px",
          borderRadius: 8,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
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
