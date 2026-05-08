import "server-only";

import { supabaseAdmin } from "./supabase";

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
    if (error) console.error("[audit]", error.message);
  } catch (err) {
    console.error("[audit] insert failed", err);
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
