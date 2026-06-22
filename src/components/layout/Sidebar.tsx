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
      className="hidden flex-shrink-0 flex-col text-white md:flex"
      style={{ width: 240, background: "#2a2929" }}
    >
      <div className="flex-shrink-0 px-5 pt-5 pb-3">
        <Link
          href="/"
          aria-label="NTV Vault home"
          className="ntv-logo font-mono text-2xl font-bold tracking-wider text-[#3DD6C8]"
        >
          NTV
        </Link>
      </div>

      <nav aria-label="Primary" className="flex-shrink-0 px-2 py-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                active
                  ? "bg-white/10 text-white"
                  : "text-[#B3B3B3] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div
        className="mx-4 my-2 flex-shrink-0 border-t"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      />

      <div className="flex-shrink-0 px-5 pb-2 pt-1">
        <h2
          id="sidebar-collection-heading"
          className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#B3B3B3]"
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
                  className="group flex items-center gap-3 rounded-md py-2 pr-2 transition-colors duration-150 hover:bg-white/[0.06]"
                  style={{
                    borderLeft: active
                      ? "3px solid #3DD6C8"
                      : "3px solid transparent",
                    paddingLeft: 5,
                    background: active ? "rgba(255,255,255,0.04)" : undefined,
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
                        active ? "text-[#3DD6C8]" : "text-white"
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

      <div
        className="flex-shrink-0 px-5 py-3 text-[11px] text-[#B3B3B3]"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="mb-1.5 flex flex-wrap gap-x-2 gap-y-1">
          <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-white transition-colors duration-150">Terms</Link>
          <span aria-hidden="true">·</span>
          <Link href="/admin" className="hover:text-white transition-colors duration-150">Admin</Link>
        </div>
        © 2026 Nano Tech Vibe
      </div>
    </aside>
  );
}
