import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Single, guarded entry point for the service-role Supabase client.
//
// The service-role key bypasses RLS, so this module is the one place it may be
// constructed. The `server-only` import above makes any client component that
// transitively imports it a hard build error — the key can never reach the
// browser bundle. Import `supabaseAdmin` from here (never re-export it from a
// browser-reachable module).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Memoize on globalThis so Next.js dev HMR and warm Fluid Compute instance
// reuse don't spawn duplicate clients (each holds its own connection pool).
const globalForAdmin = globalThis as unknown as {
  __supabaseAdmin?: SupabaseClient;
};

function adminClient(): SupabaseClient {
  // Server-only, RLS-bypassing client never represents a user session — disable
  // session persistence and token auto-refresh (no refresh timers per instance).
  return (globalForAdmin.__supabaseAdmin ??= createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  ));
}

// Lazy proxy: preserves the `import { supabaseAdmin }` value API while deferring
// createClient (and reading SUPABASE_SERVICE_ROLE_KEY) until first property
// access, so routes that never touch the DB pay nothing on cold start.
export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = adminClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
