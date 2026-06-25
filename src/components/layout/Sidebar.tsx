"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search, Music, Users, Volume2 } from "lucide-react";
import type { Album } from "@/types/music";
import { getAlbumCover } from "@/lib/albumCover";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Your Library", icon: Library },
  { href: "/sounds", label: "Sounds", icon: Volume2 },
  { href: "/search", label: "Search", icon: Search },
  { href: "/artists", label: "Artists", icon: Users },
];

type Props = {
  initialAlbums: Album[];
};

// TODO: when catalog grows past 50, add IntersectionObserver-backed pagination
// that calls /api/albums?page=N&limit=50 and appends results.
export function Sidebar({ initialAlbums }: Props) {
  const pathname = usePathname();

  return (
    // TODO: hidden below md — needs a mobile bottom tab bar (later phase).
    <aside
      aria-label="Sidebar"
      className="hidden flex-shrink-0 flex-col md:flex"
      style={{ width: 320, background: "#1a2120", borderRight: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <Link
          href="/"
          aria-label="NTV Vault home"
          className="ntv-logo font-[family-name:var(--font-bungee)] text-[22px] tracking-tighter text-[#62f3e4] leading-none"
        >
          NTV
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-shrink-0 px-3 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-[#2f3635] text-[#62f3e4] font-bold"
                  : "text-[#bbcac6] hover:bg-[#242b2a] hover:text-[#dde4e2]"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="mx-4 my-2 flex-shrink-0 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      />

      <div className="flex-shrink-0 px-6 pb-2 pt-1">
        <h2
          id="sidebar-collection-heading"
          className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.22em] text-[#bbcac6]/60"
        >
          Your Collection
        </h2>
      </div>

      <ul
        aria-labelledby="sidebar-collection-heading"
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
      >
        {initialAlbums.length === 0 ? (
          <li className="px-3 py-4 text-xs text-[#B3B3B3]">
            No albums yet — run the seed script.
          </li>
        ) : (
          initialAlbums.map((album) => {
            const active =
              pathname === `/album/${album.slug}` ||
              pathname === `/album/${album.id}`;
            const year = album.releaseDate?.slice(0, 4) ?? "";
            return (
              <li key={album.id}>
                <Link
                  href={`/album/${album.slug}`}
                  aria-label={year ? `${album.title}, ${year}` : album.title}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-center gap-3 rounded-lg py-2 pr-2 transition-colors duration-150 hover:bg-[#242b2a]"
                  style={{
                    borderLeft: active
                      ? "3px solid #62f3e4"
                      : "3px solid transparent",
                    paddingLeft: 5,
                    background: active ? "rgba(98,243,228,0.05)" : undefined,
                  }}
                >
                  {album.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAlbumCover(album.coverImage, 40)}
                      alt={`${album.title} album cover`}
                      className="h-10 w-10 flex-shrink-0 rounded object-cover"
                      onError={(e) => {
                        const el = e.currentTarget as HTMLImageElement;
                        el.style.display = "none";
                        const sib = el.nextElementSibling as HTMLElement | null;
                        if (sib) sib.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded"
                    style={{ background: album.bgColor, color: album.accentColor }}
                    aria-hidden="true"
                  >
                    <Music size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-medium transition-colors duration-150 ${
                        active ? "text-[#62f3e4]" : "text-[#dde4e2]"
                      }`}
                    >
                      {album.title}
                    </div>
                    <div className="truncate text-xs text-[#B3B3B3]">
                      Album · {year}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>

      {/* Bottom panel: brand + links */}
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
