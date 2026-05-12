"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Disc3,
  Music2,
  Tag,
  Receipt,
  ListMusic,
  BarChart3,
  ShieldCheck,
  Users,
  Volume2,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/albums", label: "Albums", icon: Disc3 },
  { href: "/admin/tracks", label: "Tracks", icon: Music2 },
  { href: "/admin/sounds", label: "Sounds", icon: Volume2 },
  { href: "/admin/artists", label: "Artists", icon: Users },
  { href: "/admin/discounts", label: "Discounts", icon: Tag },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/playlist", label: "Playlist", icon: ListMusic },
  { href: "/admin/vault", label: "Vault", icon: ShieldCheck, accent: "#EB41DF" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-[#1a1919] text-white">
      <header className="sticky top-14 z-10 flex h-14 flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#222121] px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="font-mono text-xl font-bold tracking-wider text-[#3DD6C8]">
            NTV
          </span>
          <span className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            Admin
          </span>
        </Link>
        <nav className="hidden gap-1 md:flex">
          {NAV.map(({ href, label, exact, accent }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`rounded px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
                style={active && accent ? { color: accent } : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <form action="/api/admin/auth/logout" method="post">
          <button
            type="submit"
            className="rounded border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:border-white/30 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="flex flex-1 items-start">
        <aside className="sticky top-28 hidden max-h-[calc(100vh-7rem)] w-56 flex-shrink-0 self-start overflow-y-auto border-r border-white/10 bg-[#222121] p-3 md:block">
          <ul className="space-y-1">
            {NAV.map(({ href, label, icon: Icon, exact, accent }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-white/10"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                    style={active ? { color: accent ?? "#3DD6C8" } : undefined}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* pb-32 on mobile gives clearance for the floating PlayerBar (~88px)
            plus the MobileTabBar (60px) so admin content isn't hidden under
            them. md+ resets since both bars are fixed within their own layout
            already and don't cover desktop content. */}
        <main className="min-w-0 flex-1 pb-32 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
