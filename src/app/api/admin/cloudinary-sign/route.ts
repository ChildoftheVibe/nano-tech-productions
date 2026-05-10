import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";
const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";

const SLUG_RE = /^[a-z0-9_-]+$/;

function isAllowedFolder(folder: string): boolean {
  // Legacy shared cover folder, kept so existing albums keep working.
  if (folder === "ntp/images/covers") return true;
  // Per-slug cover folder: ntp/<slug>/cover
  if (folder.startsWith("ntp/") && folder.endsWith("/cover")) {
    const slug = folder.slice("ntp/".length, -"/cover".length);
    return SLUG_RE.test(slug);
  }
  for (const base of ["ntp/audio/public/", "ntp/audio/vault/"] as const) {
    if (folder.startsWith(base)) {
      const slug = folder.slice(base.length);
      return SLUG_RE.test(slug);
    }
  }
  return false;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "cloudinary_unconfigured" },
      { status: 503, headers: noStore },
    );
  }

  let body: { folder?: string; resourceType?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  const folder = body.folder ?? "";
  if (!isAllowedFolder(folder)) {
    return NextResponse.json(
      { error: "folder_not_allowed" },
      { status: 400, headers: noStore },
    );
  }

  const resourceType =
    body.resourceType === "video" || body.resourceType === "raw"
      ? body.resourceType
      : "image";

  const timestamp = Math.floor(Date.now() / 1000);

  const isVault = folder.startsWith("ntp/audio/vault");
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };
  if (isVault) paramsToSign.type = "authenticated";

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json(
    {
      cloudName,
      apiKey,
      timestamp,
      folder,
      resourceType,
      signature,
      type: isVault ? "authenticated" : "upload",
    },
    { headers: noStore },
  );
}
