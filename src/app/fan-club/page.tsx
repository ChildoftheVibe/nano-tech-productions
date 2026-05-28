import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FanClubHubClient } from "@/components/fan-club/FanClubHubClient";

export const dynamic = "force-dynamic";

export default async function FanClubHubPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/fan-club/login");
  }

  const { data: member } = await supabase
    .from("fan_club_members")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <FanClubHubClient
      user={{
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata ?? {},
      }}
      member={member}
    />
  );
}
