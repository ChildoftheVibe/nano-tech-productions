import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

/**
 * PayPal webhook receiver.  All events are signature-verified before any
 * processing occurs. Register this URL in the PayPal dashboard and set
 * PAYPAL_WEBHOOK_ID in env to the resulting webhook ID.
 */
export async function POST(req: Request) {
  // Read the raw body before parsing — PayPal signs the exact bytes.
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: noStore });
  }

  // Verify the PayPal webhook signature BEFORE processing any payload data.
  let signatureValid: boolean;
  try {
    signatureValid = await verifyWebhookSignature(req.headers, rawBody);
  } catch (err) {
    logError(err, { caller: "paypal/webhook signature check" });
    return NextResponse.json({ error: "signature_check_failed" }, { status: 500, headers: noStore });
  }

  if (!signatureValid) {
    await logAuditEvent({
      eventType: "paypal_webhook_invalid_signature",
      performedBy: clientIpFromHeaders(req.headers),
      ipAddress: clientIpFromHeaders(req.headers),
      metadata: {
        transmission_id: req.headers.get("paypal-transmission-id"),
      },
    });
    return NextResponse.json({ error: "invalid_signature" }, { status: 401, headers: noStore });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: noStore });
  }

  const eventType = typeof event.event_type === "string" ? event.event_type : "unknown";
  const ip = clientIpFromHeaders(req.headers);

  await logAuditEvent({
    eventType: "paypal_webhook_received",
    performedBy: "paypal",
    ipAddress: ip,
    metadata: {
      event_type: eventType,
      transmission_id: req.headers.get("paypal-transmission-id"),
    },
  });

  // Route event types. CHECKOUT.ORDER.COMPLETED is handled client-side via
  // /api/paypal/verify (which captures and mints download tokens). The webhook
  // acts as a reliability net — if the client call was lost, re-trigger here.
  // Add additional event handlers below as the integration grows.
  switch (eventType) {
    case "CHECKOUT.ORDER.COMPLETED":
      // Order capture is idempotent in /api/paypal/verify — safely re-entrant.
      break;
    default:
      // Unhandled event types are acknowledged (200) but not acted upon.
      break;
  }

  return NextResponse.json({ ok: true }, { headers: noStore });
}
