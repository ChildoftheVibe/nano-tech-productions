"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";

export type GalleryItem = {
  id: string;
  url: string;
  media_type: "image" | "video";
  caption?: string | null;
};

type Props = {
  items: GalleryItem[];
  accent: string;
  albumTitle: string;
  open: boolean;
  onClose: () => void;
};

export function AlbumMediaGallery({ items, accent, albumTitle, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const touchStartX = useRef<number | null>(null);

  // Reset to first item when opening (render-time derived-state reset)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setIndex(0);
  }

  // Close on Escape, arrow-key navigation
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // navigate changes every render — intentionally omit to avoid stale closure issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (items.length === 0) return null;

  function navigate(d: number) {
    setDir(d);
    setIndex((i) => (i + d + items.length) % items.length);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    navigate(dx < 0 ? 1 : -1);
  }

  const current = items[index];
  if (!current) return null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? "60%" : "-60%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d < 0 ? "60%" : "-60%", opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gallery-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.88)",
              zIndex: 60,
              backdropFilter: "blur(8px)",
            }}
          />

          {/* Modal shell */}
          <motion.div
            key="gallery-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`${albumTitle} Gallery`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 61,
              width: "min(860px, calc(100vw - 24px))",
              maxHeight: "calc(100vh - 48px)",
              display: "flex",
              flexDirection: "column",
              borderRadius: 18,
              background: "#0d1413",
              border: `1px solid ${accent}22`,
              boxShadow: `0 0 80px ${accent}18, 0 32px 80px rgba(0,0,0,0.7)`,
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px 12px",
                borderBottom: `1px solid ${accent}18`,
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Images size={15} style={{ color: accent }} />
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 11,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    fontWeight: 600,
                  }}
                >
                  {albumTitle} · Gallery
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  {index + 1} / {items.length}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close gallery"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#bbcac6",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Main viewer */}
            <div
              style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              <AnimatePresence custom={dir} mode="popLayout">
                <motion.div
                  key={current.id}
                  custom={dir}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#090f0e",
                  }}
                >
                  {current.media_type === "video" ? (
                    <video
                      src={current.url}
                      controls
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      crossOrigin="anonymous"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={current.url}
                      alt={current.caption ?? "Gallery image"}
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      draggable={false}
                    />
                  )}

                  {/* Caption overlay */}
                  {current.caption && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: "linear-gradient(transparent, rgba(0,0,0,0.75))",
                        padding: "32px 20px 16px",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.85)",
                        pointerEvents: "none",
                      }}
                    >
                      {current.caption}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Prev / Next arrows */}
              {items.length > 1 && (
                <>
                  <button
                    onClick={() => navigate(-1)}
                    aria-label="Previous"
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 2,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)",
                      border: `1px solid ${accent}33`,
                      color: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => navigate(1)}
                    aria-label="Next"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      zIndex: 2,
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)",
                      border: `1px solid ${accent}33`,
                      color: accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {items.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  padding: "10px 16px",
                  overflowX: "auto",
                  borderTop: `1px solid ${accent}14`,
                  flexShrink: 0,
                }}
                className="no-scrollbar"
              >
                {items.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => { setDir(i > index ? 1 : -1); setIndex(i); }}
                    aria-label={`View item ${i + 1}`}
                    style={{
                      flexShrink: 0,
                      width: 56,
                      height: 40,
                      borderRadius: 6,
                      overflow: "hidden",
                      border: i === index ? `2px solid ${accent}` : "2px solid transparent",
                      opacity: i === index ? 1 : 0.5,
                      cursor: "pointer",
                      transition: "opacity 0.15s, border-color 0.15s",
                      background: "#1a2120",
                    }}
                  >
                    {item.media_type === "video" ? (
                      <video src={item.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom accent bar */}
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
                flexShrink: 0,
              }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
