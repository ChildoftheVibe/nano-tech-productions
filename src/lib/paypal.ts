import "server-only";

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
const env = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";

const BASE_URL =
  env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

export class PayPalError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export function isPayPalConfigured(): boolean {
  return (
    !!clientId &&
    !!clientSecret &&
    clientSecret !== "skip_for_now" &&
    !clientSecret.toLowerCase().startsWith("skip")
  );
}

async function getAccessToken(): Promise<string> {
  if (!isPayPalConfigured()) {
    throw new PayPalError("PayPal credentials not configured", "not_configured");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new PayPalError(
      `oauth_failed: ${res.status}`,
      "oauth_failed",
      res.status,
    );
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 0) * 1000,
  };
  return cachedToken.value;
}

export type PayPalLineItem = {
  name: string;
  unit_amount: { currency_code: string; value: string };
  quantity: string;
};

export type CreateOrderArgs = {
  total: number;
  currency?: string;
  description?: string;
  items?: PayPalLineItem[];
};

export async function createPayPalOrder({
  total,
  currency = "USD",
  description,
  items,
}: CreateOrderArgs): Promise<{ id: string }> {
  const token = await getAccessToken();
  const value = total.toFixed(2);
  const itemTotal = items
    ? items
        .reduce(
          (s, i) => s + Number(i.unit_amount.value) * Number(i.quantity || "1"),
          0,
        )
        .toFixed(2)
    : value;

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value,
          breakdown: items
            ? { item_total: { currency_code: currency, value: itemTotal } }
            : undefined,
        },
        description,
        items,
      },
    ],
    application_context: {
      shipping_preference: "NO_SHIPPING",
      user_action: "PAY_NOW",
    },
  };

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      `create_failed: ${res.status} ${text}`,
      "create_failed",
      res.status,
    );
  }
  const json = (await res.json()) as { id: string };
  return { id: json.id };
}

export type CaptureResult = {
  status: string;
  payerEmail: string | null;
  amountValue: string | null;
  amountCurrency: string | null;
  raw: unknown;
};

export async function capturePayPalOrder(orderId: string): Promise<CaptureResult> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      `capture_failed: ${res.status} ${text}`,
      "capture_failed",
      res.status,
    );
  }
  const json = (await res.json()) as {
    status: string;
    payer?: { email_address?: string };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          amount?: { value?: string; currency_code?: string };
          status?: string;
        }>;
      };
    }>;
  };
  const capture = json.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: json.status,
    payerEmail: json.payer?.email_address ?? null,
    amountValue: capture?.amount?.value ?? null,
    amountCurrency: capture?.amount?.currency_code ?? null,
    raw: json,
  };
}
