#!/usr/bin/env node
// Clear admin-login rate-limit rows so a locked-out IP can try again.
//
//   node --env-file=.env.local scripts/clear-admin-rate-limit.mjs
//   node --env-file=.env.local scripts/clear-admin-rate-limit.mjs --ip 1.2.3.4
//
// With no --ip, deletes every admin_login row in rate_limits.

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ip = arg("ip");
const query = supabase.from("rate_limits").delete().eq("action", "admin_login");
const { error, count } = ip
  ? await query.eq("identifier", ip).select("identifier", { count: "exact" })
  : await query.select("identifier", { count: "exact" });

if (error) {
  console.error("delete failed:", error.message);
  process.exit(1);
}

console.log(
  `cleared ${count ?? 0} admin_login rate-limit row(s)${ip ? ` for ${ip}` : ""}`,
);
