import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser-safe anon client (RLS-enforced). Runs in the browser for Fan Club
// auth — sign-in / OAuth / sessions — so session persistence stays at default.
//
// The service-role admin client lives in `./db/admin` (server-only). Do not
// add it here: this module is imported by client components.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Memoize on globalThis so Next.js dev HMR and warm instance reuse don't spawn
// duplicate clients (each holds its own connection pool and auth refresh timers).
const globalForSupabase = globalThis as unknown as {
  __supabase?: SupabaseClient;
};

function anonClient(): SupabaseClient {
  return (globalForSupabase.__supabase ??= createClient(
    supabaseUrl,
    supabaseAnonKey
  ));
}

// Lazy proxy: preserves the `import { supabase }` value API while deferring
// createClient until the first property access.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = anonClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
