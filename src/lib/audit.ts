import "server-only";

import { supabaseAdmin } from "./db/admin";
import { logError } from "@/lib/logger";

export type AuditEvent = {
  eventType: string;
  entityType?: string;
  entityId?: string;
  performedBy: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_log").insert({
      event_type: event.eventType,
      entity_type: event.entityType ?? null,
      entity_id: event.entityId ?? null,
      performed_by: event.performedBy,
      ip_address: event.ipAddress ?? null,
      user_agent: event.userAgent ?? null,
      metadata: event.metadata ?? null,
    });
    if (error) logError(error, { caller: "audit" });
  } catch (err) {
    logError(err, { caller: "audit" });
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  // Cloudflare sets CF-Connecting-IP with the true visitor IP. The proxy also
  // mirrors it onto x-client-ip for handlers that get the resolved value.
  const cfIp = headers.get("cf-connecting-ip") ?? headers.get("x-client-ip");
  if (cfIp) return cfIp;
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
