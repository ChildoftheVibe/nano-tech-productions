import * as React from "react";

const COLORS = {
  bg: "#393838",
  panel: "#2a2a2a",
  border: "#4a4a4a",
  text: "#f5f5f5",
  muted: "#b8b8b8",
  teal: "#3DD6C8",
  buttonText: "#0c1f1d",
};

const fontStack =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const formatUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export type EmailItem = {
  name: string;
  kind: "track" | "album" | "instrumental";
  price: number;
};

export type EmailDownload = {
  trackName: string;
  url: string;
};

export type EmailStreaming = {
  albumName: string;
  spotify?: string | null;
  appleMusic?: string | null;
  youtube?: string | null;
  amazon?: string | null;
};

export type OrderConfirmationProps = {
  orderNumber: string;
  items: EmailItem[];
  subtotal: number;
  discount?: number;
  total: number;
  downloads: EmailDownload[];
  streaming: EmailStreaming[];
  siteUrl: string;
};

export function OrderConfirmation(props: OrderConfirmationProps) {
  const {
    orderNumber,
    items,
    subtotal,
    discount = 0,
    total,
    downloads,
    streaming,
    siteUrl,
  } = props;

  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your NTV Purchase</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.bg,
          color: COLORS.text,
          fontFamily: fontStack,
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: COLORS.bg, padding: "32px 16px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="600"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: "100%",
                    maxWidth: 600,
                    backgroundColor: COLORS.panel,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                  }}
                >
                  <tbody>
                    {/* Header */}
                    <tr>
                      <td style={{ padding: "32px 32px 16px 32px" }}>
                        <div
                          style={{
                            color: COLORS.teal,
                            fontSize: 24,
                            fontWeight: 700,
                            letterSpacing: 2,
                          }}
                        >
                          NTV
                        </div>
                        <div
                          style={{
                            color: COLORS.muted,
                            fontSize: 12,
                            letterSpacing: 1,
                            textTransform: "uppercase",
                            marginTop: 4,
                          }}
                        >
                          Nano Tech Vibe
                        </div>
                      </td>
                    </tr>

                    {/* Hero */}
                    <tr>
                      <td style={{ padding: "8px 32px 16px 32px" }}>
                        <h1
                          style={{
                            color: COLORS.teal,
                            fontSize: 28,
                            fontWeight: 700,
                            margin: 0,
                            lineHeight: 1.2,
                          }}
                        >
                          Thank you for your purchase
                        </h1>
                        <p
                          style={{
                            color: COLORS.muted,
                            fontSize: 14,
                            margin: "12px 0 0 0",
                          }}
                        >
                          Order #{orderNumber}
                        </p>
                      </td>
                    </tr>

                    {/* Items */}
                    <tr>
                      <td style={{ padding: "16px 32px" }}>
                        <h2
                          style={{
                            color: COLORS.text,
                            fontSize: 14,
                            textTransform: "uppercase",
                            letterSpacing: 1.5,
                            margin: "0 0 12px 0",
                          }}
                        >
                          Order Summary
                        </h2>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{
                            borderCollapse: "collapse",
                            fontSize: 14,
                          }}
                        >
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td
                                  style={{
                                    padding: "10px 0",
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    color: COLORS.text,
                                  }}
                                >
                                  {item.name}
                                  <span
                                    style={{
                                      color: COLORS.muted,
                                      fontSize: 12,
                                      marginLeft: 8,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {item.kind}
                                  </span>
                                </td>
                                <td
                                  align="right"
                                  style={{
                                    padding: "10px 0",
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    color: COLORS.text,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatUSD(item.price)}
                                </td>
                              </tr>
                            ))}
                            <tr>
                              <td
                                style={{
                                  padding: "12px 0 4px 0",
                                  color: COLORS.muted,
                                }}
                              >
                                Subtotal
                              </td>
                              <td
                                align="right"
                                style={{
                                  padding: "12px 0 4px 0",
                                  color: COLORS.muted,
                                }}
                              >
                                {formatUSD(subtotal)}
                              </td>
                            </tr>
                            {discount > 0 ? (
                              <tr>
                                <td style={{ padding: "4px 0", color: COLORS.muted }}>
                                  Discount
                                </td>
                                <td
                                  align="right"
                                  style={{ padding: "4px 0", color: COLORS.teal }}
                                >
                                  −{formatUSD(discount)}
                                </td>
                              </tr>
                            ) : null}
                            <tr>
                              <td
                                style={{
                                  padding: "8px 0 0 0",
                                  color: COLORS.text,
                                  fontSize: 16,
                                  fontWeight: 700,
                                }}
                              >
                                Total
                              </td>
                              <td
                                align="right"
                                style={{
                                  padding: "8px 0 0 0",
                                  color: COLORS.teal,
                                  fontSize: 16,
                                  fontWeight: 700,
                                }}
                              >
                                {formatUSD(total)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Downloads */}
                    {downloads.length > 0 ? (
                      <tr>
                        <td style={{ padding: "24px 32px 8px 32px" }}>
                          <h2
                            style={{
                              color: COLORS.text,
                              fontSize: 14,
                              textTransform: "uppercase",
                              letterSpacing: 1.5,
                              margin: "0 0 12px 0",
                            }}
                          >
                            Your Downloads
                          </h2>
                          <p
                            style={{
                              color: COLORS.muted,
                              fontSize: 13,
                              margin: "0 0 16px 0",
                            }}
                          >
                            Links expire in 2 hours. Download to keep your files
                            forever.
                          </p>
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                          >
                            <tbody>
                              {downloads.map((d, idx) => (
                                <tr key={idx}>
                                  <td style={{ padding: "6px 0" }}>
                                    <table
                                      role="presentation"
                                      width="100%"
                                      cellPadding={0}
                                      cellSpacing={0}
                                    >
                                      <tbody>
                                        <tr>
                                          <td
                                            style={{
                                              color: COLORS.text,
                                              fontSize: 14,
                                              paddingRight: 12,
                                            }}
                                          >
                                            {d.trackName}
                                          </td>
                                          <td align="right" style={{ whiteSpace: "nowrap" }}>
                                            <a
                                              href={d.url}
                                              style={{
                                                backgroundColor: COLORS.teal,
                                                color: COLORS.buttonText,
                                                padding: "8px 16px",
                                                borderRadius: 6,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                textDecoration: "none",
                                                display: "inline-block",
                                              }}
                                            >
                                              Download
                                            </a>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}

                    {/* Streaming links per album */}
                    {streaming.length > 0 ? (
                      <tr>
                        <td style={{ padding: "16px 32px" }}>
                          <h2
                            style={{
                              color: COLORS.text,
                              fontSize: 14,
                              textTransform: "uppercase",
                              letterSpacing: 1.5,
                              margin: "0 0 12px 0",
                            }}
                          >
                            Listen on streaming
                          </h2>
                          {streaming.map((s, idx) => {
                            const links: Array<[string, string | null | undefined]> = [
                              ["Spotify", s.spotify],
                              ["Apple Music", s.appleMusic],
                              ["YouTube", s.youtube],
                              ["Amazon", s.amazon],
                            ];
                            const present = links.filter(([, url]) => !!url);
                            if (!present.length) return null;
                            return (
                              <div key={idx} style={{ marginBottom: 12 }}>
                                <div
                                  style={{
                                    color: COLORS.text,
                                    fontSize: 14,
                                    marginBottom: 6,
                                  }}
                                >
                                  {s.albumName}
                                </div>
                                <div>
                                  {present.map(([label, url], i) => (
                                    <a
                                      key={i}
                                      href={url as string}
                                      style={{
                                        color: COLORS.teal,
                                        fontSize: 13,
                                        marginRight: 16,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {label}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </td>
                      </tr>
                    ) : null}

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          padding: "24px 32px 32px 32px",
                          borderTop: `1px solid ${COLORS.border}`,
                        }}
                      >
                        <p
                          style={{
                            color: COLORS.muted,
                            fontSize: 12,
                            margin: 0,
                            lineHeight: 1.6,
                          }}
                        >
                          <a
                            href={siteUrl}
                            style={{ color: COLORS.teal, textDecoration: "none" }}
                          >
                            nanotechvibe.com
                          </a>
                          {" · "}
                          <a
                            href={`${siteUrl}/privacy`}
                            style={{ color: COLORS.muted, textDecoration: "underline" }}
                          >
                            Privacy
                          </a>
                          {" · "}
                          <a
                            href={`${siteUrl}/terms`}
                            style={{ color: COLORS.muted, textDecoration: "underline" }}
                          >
                            Terms
                          </a>
                        </p>
                        <p
                          style={{
                            color: COLORS.muted,
                            fontSize: 11,
                            margin: "12px 0 0 0",
                          }}
                        >
                          Questions? Reply to this email.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function renderOrderConfirmationText(props: OrderConfirmationProps): string {
  const lines: string[] = [];
  lines.push(`NTV — Thank you for your purchase`);
  lines.push(`Order #${props.orderNumber}`);
  lines.push("");
  lines.push("Order Summary:");
  for (const item of props.items) {
    lines.push(`  ${item.name} (${item.kind}) — ${formatUSD(item.price)}`);
  }
  lines.push(`  Subtotal: ${formatUSD(props.subtotal)}`);
  if ((props.discount ?? 0) > 0) {
    lines.push(`  Discount: -${formatUSD(props.discount ?? 0)}`);
  }
  lines.push(`  Total: ${formatUSD(props.total)}`);
  if (props.downloads.length) {
    lines.push("");
    lines.push("Downloads (links expire in 2 hours):");
    for (const d of props.downloads) {
      lines.push(`  ${d.trackName}: ${d.url}`);
    }
  }
  if (props.streaming.length) {
    lines.push("");
    lines.push("Listen on streaming:");
    for (const s of props.streaming) {
      const items = [
        ["Spotify", s.spotify],
        ["Apple Music", s.appleMusic],
        ["YouTube", s.youtube],
        ["Amazon", s.amazon],
      ].filter(([, v]) => !!v) as [string, string][];
      if (!items.length) continue;
      lines.push(`  ${s.albumName}`);
      for (const [label, url] of items) lines.push(`    ${label}: ${url}`);
    }
  }
  lines.push("");
  lines.push(`${props.siteUrl} · ${props.siteUrl}/privacy · ${props.siteUrl}/terms`);
  return lines.join("\n");
}

export type AdminAlertProps = {
  orderNumber: string;
  total: number;
  items: EmailItem[];
  customerEmail: string | null;
  siteUrl: string;
};

export function AdminNewOrderAlert(props: AdminAlertProps) {
  const { orderNumber, total, items, customerEmail, siteUrl } = props;
  return (
    <html lang="en">
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta charSet="utf-8" />
        <title>New NTV Sale</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: COLORS.bg,
          color: COLORS.text,
          fontFamily: fontStack,
        }}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ padding: "32px 16px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="560"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    backgroundColor: COLORS.panel,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ padding: 32 }}>
                        <div
                          style={{
                            color: COLORS.teal,
                            fontSize: 12,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                          }}
                        >
                          NTV · Sale
                        </div>
                        <h1
                          style={{
                            color: COLORS.text,
                            fontSize: 28,
                            margin: "8px 0 4px 0",
                          }}
                        >
                          New sale: {formatUSD(total)}
                        </h1>
                        <p
                          style={{
                            color: COLORS.muted,
                            fontSize: 13,
                            margin: 0,
                          }}
                        >
                          Order #{orderNumber}
                          {customerEmail ? ` · ${customerEmail}` : ""}
                        </p>

                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ marginTop: 24, fontSize: 14 }}
                        >
                          <tbody>
                            {items.map((item, idx) => (
                              <tr key={idx}>
                                <td
                                  style={{
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    color: COLORS.text,
                                  }}
                                >
                                  {item.name}
                                  <span
                                    style={{
                                      color: COLORS.muted,
                                      fontSize: 12,
                                      marginLeft: 8,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {item.kind}
                                  </span>
                                </td>
                                <td
                                  align="right"
                                  style={{
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${COLORS.border}`,
                                    color: COLORS.text,
                                  }}
                                >
                                  {formatUSD(item.price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <p style={{ marginTop: 24 }}>
                          <a
                            href={`${siteUrl}/admin/orders`}
                            style={{
                              backgroundColor: COLORS.teal,
                              color: COLORS.buttonText,
                              padding: "10px 18px",
                              borderRadius: 6,
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-block",
                            }}
                          >
                            Open admin orders
                          </a>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function renderAdminNewOrderAlertText(props: AdminAlertProps): string {
  const lines: string[] = [];
  lines.push(`New NTV sale: ${formatUSD(props.total)}`);
  lines.push(`Order #${props.orderNumber}`);
  if (props.customerEmail) lines.push(`Customer: ${props.customerEmail}`);
  lines.push("");
  for (const item of props.items) {
    lines.push(`  ${item.name} (${item.kind}) — ${formatUSD(item.price)}`);
  }
  lines.push("");
  lines.push(`Admin: ${props.siteUrl}/admin/orders`);
  return lines.join("\n");
}

