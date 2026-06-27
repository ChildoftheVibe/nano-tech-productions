"use client";

export function CartModal({ open }: { open: boolean }) {
  if (!open) return null;
  return <div className="fixed inset-0 bg-[#121212]/60" />;
}
