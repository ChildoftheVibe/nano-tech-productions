import { supabaseAdmin } from "@/lib/supabase";
import type { Album, DiscountCode } from "@/lib/db-types";
import { DiscountsManager } from "./DiscountsManager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const [discountsRes, albumsRes] = await Promise.all([
    supabaseAdmin
      .from("discount_codes")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("albums")
      .select("id, title")
      .order("title", { ascending: true }),
  ]);

  const error = discountsRes.error ?? albumsRes.error;

  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-semibold">Manage Discounts</h1>
      {error ? (
        <p className="text-red-400">Failed to load: {error.message}</p>
      ) : (
        <DiscountsManager
          initialDiscounts={(discountsRes.data ?? []) as DiscountCode[]}
          albums={(albumsRes.data ?? []) as Pick<Album, "id" | "title">[]}
        />
      )}
    </main>
  );
}
