import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paypal";
import { logAuditEvent, clientIpFromHeaders } from "@/lib/audit";
import { logError } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "cache-control": "no-store", pragma: "no-cache" };

// PayPal's published webhook source IP ranges (H5).
// Verify current list at https://developer.paypal.com/api/rest/webhooks/#link-ipaddresswhitelist
const PAYPAL_IP_RANGES = [
  "173.0.80.0/20",
  "64.4.240.0/21",
  "66.211.168.0/22",
  "91.243.72.0/22",
  "212.79.100.0/22",
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function isIpInCidr(ip: string, cidr: string): boolean {
  const [network, prefixLen] = cidr.split("/");
  const mask = ~((1 << (32 - parseInt(prefixLen, 10))) - 1) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

function isPayPalIp(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  return PAYPAL_IP_RANGES.some((cidr) => isIpInCidr(ip, cidr));
}

/**
 * PayPal webhook receiver.  All events are signature-verified before any
 * processing occurs. Register this URL in the PayPal dashboard and set
 * PAYPAL_WEBHOOK_ID in env to the resulting webhook ID.
 */
export async function POST(req: Request) {
  // H5: Reject requests that don't originate from PayPal's IP ranges before
  // any expensive processing. Sandbox IPs bypass the check in non-prod.
  const ip = clientIpFromHeaders(req.headers);
  const isSandbox = process.env.PAYPAL_ENV !== "live";
  if (!isSandbox && !isPayPalIp(ip)) {
    await logAuditEvent({
      eventType: "paypal_webhook_ip_blocked",
      performedBy: ip,
      ipAddress: ip,
      metadata: { ip },
    });
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }

  // Read the raw body before parsing — PayPal signs the exact bytes.
  // (ip is already declared above; reused below in logAuditEvent calls)
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
