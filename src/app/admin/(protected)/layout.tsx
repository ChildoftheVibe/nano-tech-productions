import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <nav className="flex gap-4 text-sm">
          <Link href="/admin" className="hover:text-[#3DD6C8]">
            Dashboard
          </Link>
          <Link href="/admin/albums" className="hover:text-[#3DD6C8]">
            Albums
          </Link>
          <Link href="/admin/tracks" className="hover:text-[#3DD6C8]">
            Tracks
          </Link>
          <Link href="/admin/discounts" className="hover:text-[#3DD6C8]">
            Discounts
          </Link>
          <Link href="/admin/vault" className="hover:text-[#EB41DF]">
            Vault
          </Link>
        </nav>
        <form action="/api/admin/auth/logout" method="post">
          <button
            type="submit"
            className="text-sm text-white/70 hover:text-white"
          >
            Sign out
          </button>
        </form>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
