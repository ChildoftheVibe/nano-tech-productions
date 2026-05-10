import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data, error } = await sb
  .from("tracks")
  .select("id, title, credits, lyrics, has_lyrics")
  .limit(1);

if (error) {
  console.error("ERROR:", error.message);
  console.error("Migration likely not applied. Run supabase/migrations/0007_lyrics_credits.sql in the Supabase SQL Editor.");
  process.exit(1);
}
console.log("Migration applied. Sample row:", JSON.stringify(data?.[0] ?? null, null, 2));
