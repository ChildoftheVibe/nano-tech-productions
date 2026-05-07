"use client";

export function CartModal({ open }: { open: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 bg-black/60" />;
}
