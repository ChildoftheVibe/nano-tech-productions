import Link from "next/link";
import { supabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type Wallet = {
  id: string;
  wallet_code: string;
  display_name: string | null;
  email: string | null;
  balance: number;
  lifetime_earned: number;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function formatNb(n: number) {
  return `${Number(n ?? 0).toLocaleString()} NB`;
}

type SearchParams = Promise<{ page?: string; q?: string }>;

export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { page: pageStr, q } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;
  const search = (q ?? "").trim();

  let query = supabaseAdmin
    .from("wallets")
    .select("id, wallet_code, display_name, email, balance, lifetime_earned, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(start, end);

  if (search) {
    query = query.or(
      `wallet_code.ilike.%${search}%,email.ilike.%${search}%,display_name.ilike.%${search}%`,
    );
  }

  const { data, count, error } = await query;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const wallets = (data ?? []) as Wallet[];

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    params.set("page", String(p));
    return `?${params.toString()}`;
  };

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">User Accounts</h1>

      <form className="mb-4 flex gap-2" action="">
        <input
          type="text"
          name="q"
          defaultValue={search}
          placeholder="Search by wallet code, email, or display name…"
          className="w-full max-w-md rounded-lg border border-white/15 bg-[#222121] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-[#3DD6C8] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
        >
          Search
        </button>
      </form>

      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : wallets.length === 0 ? (
        <p className="text-white/60">No accounts found.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-[#121212]/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Wallet Code</th>
                  <th className="px-4 py-3">Display Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Lifetime Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {wallets.map((w) => (
                  <tr key={w.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">
                      {formatDate(w.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/60">
                      <Link
                        href={`/admin/accounts/${w.id}`}
                        className="text-[#3DD6C8] hover:underline"
                      >
                        {w.wallet_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {w.display_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {w.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatNb(w.balance)}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {formatNb(w.lifetime_earned)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-white/70">
            <span>
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
