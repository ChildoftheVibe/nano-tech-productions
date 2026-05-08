import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getAdminWavDownloadUrl } from "@/lib/cloudinary";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = Promise<{ trackId: string }>;

const noStore = {
  "cache-control": "no-store",
  pragma: "no-cache",
};

export async function GET(req: Request, { params }: { params: Params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }

  const { trackId } = await params;
  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent") ?? undefined;

  const { data: track, error } = await supabaseAdmin
    .from("tracks")
    .select("id, vault_audio_id, title, wav_checksum, wav_file_size_mb")
    .eq("id", trackId)
    .maybeSingle();

  if (error || !track) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: noStore });
  }
  if (!track.vault_audio_id) {
    return NextResponse.json({ error: "no_vault_file" }, { status: 404, headers: noStore });
  }

  const url = getAdminWavDownloadUrl(track.vault_audio_id);
  if (!url) {
    return NextResponse.json(
      { error: "cloudinary_unconfigured" },
      { status: 503, headers: noStore },
    );
  }

  await logAuditEvent({
    eventType: "admin_wav_download",
    performedBy: "admin",
    ipAddress: ip,
    userAgent,
    entityType: "track",
    entityId: track.id,
    metadata: {
      title: track.title,
      checksum: track.wav_checksum,
      size_mb: track.wav_file_size_mb,
    },
  });

  return NextResponse.json(
    { url, expiresInSeconds: 15 * 60 },
    { headers: noStore },
  );
}
