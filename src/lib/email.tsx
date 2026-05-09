import "server-only";

import { renderToStaticMarkup } from "react-dom/server.edge";
import { Resend } from "resend";

import {
  AdminNewOrderAlert,
  OrderConfirmation,
  renderAdminNewOrderAlertText,
  renderOrderConfirmationText,
  type AdminAlertProps,
  type EmailDownload,
  type EmailItem,
  type EmailStreaming,
  type OrderConfirmationProps,
} from "@/components/email/OrderConfirmation";

let cached: Resend | null = null;

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === "re_YOUR_KEY_HERE") return null;
  if (!cached) cached = new Resend(key);
  return cached;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "noreply@nanotechvibe.com";
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nanotechvibe.com").replace(
    /\/$/,
    "",
  );
}

function renderOrderHtml(props: OrderConfirmationProps): string {
  return "<!DOCTYPE html>" + renderToStaticMarkup(<OrderConfirmation {...props} />);
}

function renderAdminHtml(props: AdminAlertProps): string {
  return "<!DOCTYPE html>" + renderToStaticMarkup(<AdminNewOrderAlert {...props} />);
}

export type SendOrderConfirmationArgs = {
  to: string;
  orderNumber: string;
  items: EmailItem[];
  subtotal: number;
  discount?: number;
  total: number;
  downloads: EmailDownload[];
  streaming?: EmailStreaming[];
};

export type SendResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: string };

export async function sendOrderConfirmation(
  args: SendOrderConfirmationArgs,
): Promise<SendResult> {
  const resend = client();
  if (!resend) return { sent: false, reason: "resend_not_configured" };

  const props: OrderConfirmationProps = {
    orderNumber: args.orderNumber,
    items: args.items,
    subtotal: args.subtotal,
    discount: args.discount ?? 0,
    total: args.total,
    downloads: args.downloads,
    streaming: args.streaming ?? [],
    siteUrl: siteUrl(),
  };

  try {
    const result = await resend.emails.send({
      from: fromAddress(),
      to: args.to,
      subject: `Your NTV Purchase - Order #${args.orderNumber}`,
      html: renderOrderHtml(props),
      text: renderOrderConfirmationText(props),
    });
    if (result.error) {
      return { sent: false, reason: result.error.message ?? "resend_error" };
    }
    return { sent: true, id: result.data?.id ?? null };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown_error",
    };
  }
}

export type SendAdminAlertArgs = {
  orderNumber: string;
  total: number;
  items: EmailItem[];
  customerEmail: string | null;
};

export async function sendAdminNewOrderAlert(
  args: SendAdminAlertArgs,
): Promise<SendResult> {
  const resend = client();
  if (!resend) return { sent: false, reason: "resend_not_configured" };

  const adminTo = process.env.ADMIN_EMAIL;
  if (!adminTo) return { sent: false, reason: "admin_email_unset" };

  const props: AdminAlertProps = { ...args, siteUrl: siteUrl() };

  try {
    const result = await resend.emails.send({
      from: fromAddress(),
      to: adminTo,
      subject: `New NTV Sale - $${args.total.toFixed(2)}`,
      html: renderAdminHtml(props),
      text: renderAdminNewOrderAlertText(props),
    });
    if (result.error) {
      return { sent: false, reason: result.error.message ?? "resend_error" };
    }
    return { sent: true, id: result.data?.id ?? null };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "unknown_error",
    };
  }
}
