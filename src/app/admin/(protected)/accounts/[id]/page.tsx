import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/db/admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Wallet = {
  id: string;
  wallet_code: string;
  display_name: string | null;
  email: string | null;
  balance: number;
  lifetime_earned: number;
  created_at: string;
  updated_at: string;
};

type WalletTransaction = {
  id: string;
  amount: number;
  balance_after: number;
  tx_type: string;
  ref: string | null;
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

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ page?: string }>;

export default async function AdminAccountDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);
  const start = (page - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE - 1;

  const { data: wallet, error: walletError } = await supabaseAdmin
    .from("wallets")
    .select("id, wallet_code, display_name, email, balance, lifetime_earned, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (walletError || !wallet) notFound();

  const { data, count } = await supabaseAdmin
    .from("wallet_transactions")
    .select("id, amount, balance_after, tx_type, ref, created_at", { count: "exact" })
    .eq("wallet_id", id)
    .order("created_at", { ascending: false })
    .range(start, end);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const transactions = (data ?? []) as WalletTransaction[];
  const w = wallet as Wallet;

  return (
    <main className="p-8">
      <Link
        href="/admin/accounts"
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← All Accounts
      </Link>

      <h1 className="mb-6 font-mono text-2xl font-semibold">{w.wallet_code}</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Balance</p>
          <p className="mt-1 text-xl font-medium text-[#3DD6C8]">{formatNb(w.balance)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Lifetime Earned</p>
          <p className="mt-1 text-xl font-medium">{formatNb(w.lifetime_earned)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Display Name</p>
          <p className="mt-1 text-white/80">{w.display_name ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Email</p>
          <p className="mt-1 text-white/80">{w.email ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Created</p>
          <p className="mt-1 text-white/80">{formatDate(w.created_at)}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#222121] p-4">
          <p className="text-xs uppercase tracking-wider text-white/50">Last Activity</p>
          <p className="mt-1 text-white/80">{formatDate(w.updated_at)}</p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Transaction History</h2>

      {transactions.length === 0 ? (
        <p className="text-white/60">No transactions yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#222121]">
            <table className="w-full text-sm">
              <thead className="bg-[#121212]/20 text-left text-xs uppercase tracking-wider text-white/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ref</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 whitespace-nowrap text-white/80">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3 text-white/70">{t.tx_type}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-white/50">
                      {t.ref ?? "—"}
                    </td>
                    <td
                      className={`px-4 py-3 font-medium ${
                        t.amount >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {formatNb(t.amount)}
                    </td>
                    <td className="px-4 py-3 text-white/70">{formatNb(t.balance_after)}</td>
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
                  href={`?page=${page - 1}`}
                  className="rounded-full border border-white/20 px-3 py-1 hover:bg-white/5"
                >
                  Previous
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={`?page=${page + 1}`}
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
