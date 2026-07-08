import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { AGENTS } from "@/lib/agents";
import { logAuditEvent } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/** Runs one of the seven platform agents (see src/lib/agents). Cron-only. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ agent: string }> },
) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const { agent } = await params;
  const run = AGENTS[agent];
  if (!run) {
    return NextResponse.json({ error: "unknown_agent" }, { status: 404, headers: noStore });
  }

  try {
    const report = await run();
    await logAuditEvent({
      eventType: "agent_run",
      performedBy: `cron:${agent}`,
      metadata: report,
    });
    return NextResponse.json({ agent, report }, { headers: noStore });
  } catch (err) {
    logError(err, { caller: `agent:${agent}` });
    return NextResponse.json({ error: "agent_failed" }, { status: 500, headers: noStore });
  }
}
