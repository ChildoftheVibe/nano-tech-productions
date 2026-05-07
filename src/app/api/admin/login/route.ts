import { setAdminCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const password =
    body && typeof body === "object" && "password" in body
      ? String((body as { password: unknown }).password ?? "")
      : "";

  if (!password || !verifyPassword(password)) {
    return Response.json({ error: "invalid_password" }, { status: 401 });
  }

  await setAdminCookie();
  return Response.json({ ok: true });
}
