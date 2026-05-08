"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Music, X } from "lucide-react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCheckoutStore, type CheckoutItemRef } from "@/store/checkoutStore";

type Phase =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "success"; downloadUrls: string[] }
  | { kind: "error"; message: string };

type DiscountState =
  | { applied: false }
  | { applied: true; code: string; percent: number; amount: number; message: string };

const fmtMoney = (n: number) => `$${n.toFixed(2)}`;

export function CheckoutModal() {
  const isOpen = useCheckoutStore((s) => s.isOpen);
  const item = useCheckoutStore((s) => s.item);
  const close = useCheckoutStore((s) => s.close);

  return (
    <AnimatePresence>
      {isOpen && item ? (
        <CheckoutModalContent item={item} onClose={close} />
      ) : null}
    </AnimatePresence>
  );
}

function CheckoutModalContent({
  item,
  onClose,
}: {
  item: CheckoutItemRef;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [discount, setDiscount] = useState<DiscountState>({ applied: false });
  const [discountInput, setDiscountInput] = useState("");
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [totalPulse, setTotalPulse] = useState(0);

  const subtotal = item.price;
  const total = useMemo(
    () =>
      Math.max(
        0,
        Math.round(
          (subtotal - (discount.applied ? discount.amount : 0)) * 100,
        ) / 100,
      ),
    [subtotal, discount],
  );

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc key closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase.kind !== "submitting") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase.kind]);

  const applyDiscount = async () => {
    setValidating(true);
    setDiscountError(null);
    try {
      const res = await fetch("/api/discounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountInput,
          cartTotal: subtotal,
          items: [{ id: item.id, kind: item.kind, albumId: item.albumId }],
        }),
      });
      const json = (await res.json()) as {
        valid: boolean;
        discountPercent: number;
        discountAmount: number;
        message: string;
      };
      if (!json.valid) {
        setDiscountError(json.message || "Invalid code.");
        setDiscount({ applied: false });
        return;
      }
      setDiscount({
        applied: true,
        code: discountInput.trim().toUpperCase(),
        percent: json.discountPercent,
        amount: json.discountAmount,
        message: json.message,
      });
      setTotalPulse((n) => n + 1);
    } catch {
      setDiscountError("Could not validate code.");
    } finally {
      setValidating(false);
    }
  };

  const orderRequestBody = () => ({
    items: [
      {
        id: item.id,
        kind: item.kind,
        name: item.name,
        price: item.price,
        albumId: item.albumId,
      },
    ],
    discountCode: discount.applied ? discount.code : undefined,
  });

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "";
  const paypalReady = !!clientId;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.target === e.currentTarget && phase.kind !== "submitting") onClose();
      }}
    >
      <motion.div
        className="w-full max-w-[480px] overflow-hidden rounded-xl text-white shadow-2xl"
        style={{
          background: "#282828",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[#3DD6C8]" />
            <h2 className="text-lg font-bold">Checkout</h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase.kind === "submitting"}
            aria-label="Close"
            className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        {phase.kind === "success" ? (
          <SuccessView phase={phase} item={item} onClose={onClose} />
        ) : (
          <div className="p-5">
            <div className="mb-4 flex items-center gap-3">
              {item.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverImage}
                  alt={item.name}
                  className="h-14 w-14 flex-shrink-0 rounded object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded"
                  style={{
                    background: item.bgColor ?? "#393838",
                    color: item.accentColor ?? "#3DD6C8",
                  }}
                >
                  <Music size={20} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs uppercase tracking-wider text-[#B3B3B3]">
                  {item.kind === "album" ? "Album" : "Single Track"}
                </div>
                <div className="truncate font-semibold">{item.name}</div>
              </div>
              <div className="text-sm font-semibold">{fmtMoney(subtotal)}</div>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[#B3B3B3]">
                Discount Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 rounded border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-[#3DD6C8]"
                  disabled={discount.applied || validating}
                />
                {discount.applied ? (
                  <button
                    onClick={() => {
                      setDiscount({ applied: false });
                      setDiscountInput("");
                      setDiscountError(null);
                      setTotalPulse((n) => n + 1);
                    }}
                    className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white/5"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={applyDiscount}
                    disabled={validating || !discountInput.trim()}
                    className="rounded bg-[#3DD6C8] px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
                  >
                    {validating ? "…" : "Apply"}
                  </button>
                )}
              </div>
              {discountError ? (
                <p className="mt-1 text-xs text-red-300">{discountError}</p>
              ) : null}
            </div>

            <div className="mb-5 space-y-1 border-t border-white/10 pt-4 text-sm">
              <Row label="Subtotal" value={fmtMoney(subtotal)} />
              <AnimatePresence initial={false}>
                {discount.applied ? (
                  <motion.div
                    key="discount-line"
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <Row
                      label={`Discount (${discount.percent}%)`}
                      value={`−${fmtMoney(discount.amount)}`}
                      accent
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <motion.div
                key={totalPulse}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="mt-2 flex justify-between border-t border-white/10 pt-2 font-bold"
              >
                <span>Total</span>
                <span>{fmtMoney(total)}</span>
              </motion.div>
            </div>

            {!paypalReady ? (
              <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                PayPal client ID is not configured. Set
                <code className="mx-1 rounded bg-black/30 px-1">
                  NEXT_PUBLIC_PAYPAL_CLIENT_ID
                </code>
                in <code>.env.local</code>.
              </div>
            ) : (
              <PayPalScriptProvider
                options={{ clientId, currency: "USD", intent: "capture" }}
              >
                {phase.kind === "error" ? (
                  <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
                    {phase.message}
                  </div>
                ) : null}
                <div
                  className={
                    phase.kind === "submitting"
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                >
                  <PayPalButtons
                    style={{ layout: "vertical", color: "gold", shape: "pill" }}
                    disabled={phase.kind === "submitting"}
                    createOrder={async () => {
                      const res = await fetch("/api/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(orderRequestBody()),
                      });
                      if (!res.ok) {
                        const json = await res.json().catch(() => ({}));
                        throw new Error(json.error ?? "create_failed");
                      }
                      const json = (await res.json()) as { orderId: string };
                      return json.orderId;
                    }}
                    onApprove={async (data) => {
                      setPhase({ kind: "submitting" });
                      try {
                        const res = await fetch("/api/paypal/verify", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            orderId: data.orderID,
                            items: orderRequestBody().items,
                            discountCode: discount.applied
                              ? discount.code
                              : undefined,
                          }),
                        });
                        const json = (await res.json()) as {
                          verified: boolean;
                          downloadUrls?: string[];
                          error?: string;
                        };
                        if (!res.ok || !json.verified) {
                          setPhase({
                            kind: "error",
                            message:
                              "Payment couldn't be verified. If you were charged, contact support.",
                          });
                          return;
                        }
                        try {
                          const { trackPurchaseComplete } = await import(
                            "@/lib/analytics"
                          );
                          trackPurchaseComplete(
                            data.orderID,
                            orderRequestBody().items,
                            total,
                          );
                        } catch {
                          // analytics best-effort
                        }
                        setPhase({
                          kind: "success",
                          downloadUrls: json.downloadUrls ?? [],
                        });
                      } catch {
                        setPhase({
                          kind: "error",
                          message: "Network error during verification. Please retry.",
                        });
                      }
                    }}
                    onError={() => {
                      setPhase({
                        kind: "error",
                        message: "PayPal returned an error. Please try again.",
                      });
                    }}
                  />
                </div>
                {phase.kind === "submitting" ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-white/70">
                    <Loader2 size={14} className="animate-spin" />
                    Verifying payment…
                  </div>
                ) : null}
              </PayPalScriptProvider>
            )}

            <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-white/40">
              Secure checkout · Never leave the site
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Row({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-white/70">{label}</span>
      <span className={accent ? "text-[#3DD6C8]" : "text-white"}>{value}</span>
    </div>
  );
}

function SuccessView({
  phase,
  item,
  onClose,
}: {
  phase: { kind: "success"; downloadUrls: string[] };
  item: CheckoutItemRef;
  onClose: () => void;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center">
        <motion.svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          aria-hidden
        >
          <motion.circle
            cx="32"
            cy="32"
            r="28"
            stroke="#3DD6C8"
            strokeWidth="3"
            fill="rgba(61,214,200,0.08)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.path
            d="M20 33L29 42L46 24"
            stroke="#3DD6C8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
          />
        </motion.svg>
      </div>
      <h3 className="mb-1 text-2xl font-bold">Purchase Complete!</h3>
      <p className="mb-5 text-sm text-white/70">
        Thanks for supporting NTV.{" "}
        {item.kind === "album" ? "Your album" : "Your track"} is yours.
      </p>
      {phase.downloadUrls.length > 0 ? (
        <div className="mb-5 space-y-2">
          {phase.downloadUrls.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-full px-4 py-2 text-sm font-bold text-black"
              style={{ background: "#3DD6C8" }}
            >
              Download{" "}
              {phase.downloadUrls.length > 1 ? `track ${i + 1}` : "MP3 (320kbps)"}
            </a>
          ))}
          <p className="text-[10px] text-white/40">
            Each link is single-use and expires in 2 hours.
          </p>
        </div>
      ) : (
        <p className="mb-5 text-xs text-yellow-200">
          Download links are unavailable for this item.
        </p>
      )}
      <button
        onClick={onClose}
        className="rounded-full border border-white/20 px-5 py-2 text-sm font-bold hover:bg-white/10"
      >
        Continue Listening
      </button>
    </div>
  );
}
