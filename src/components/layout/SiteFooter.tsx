"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  // Hide on admin pages — admin shell has its own chrome.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="mt-16 border-t border-white/5 px-6 py-8 text-xs text-white/40 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <div className="space-y-1">
          <div>
            © {new Date().getFullYear()} Nano Tech Vibe. All rights
            reserved.
          </div>
          <div>All music © Nano Tech Productions. All rights reserved.</div>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of sale
          </Link>
          <a
            href="mailto:support@nanotechproductions.com"
            className="hover:text-white"
          >
            Contact
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-6 flex max-w-6xl justify-end">
        <Link
          href="/admin"
          className="font-mono text-[10px] tracking-widest text-white/15 transition-colors hover:text-white/35"
        >
          admin
        </Link>
      </div>
    </footer>
  );
}
