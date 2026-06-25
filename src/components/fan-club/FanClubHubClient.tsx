"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Play, LogOut } from "lucide-react";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";

type MembershipTier = "standard" | "vip" | "founding";

type FanClubMember = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  membership_tier: MembershipTier;
  is_active: boolean;
  joined_at: string;
  last_seen_at: string | null;
};

type Props = {
  user: {
    id: string;
    email: string | undefined;
    user_metadata: Record<string, unknown>;
  };
  member: FanClubMember | null;
};

const TIER_LABELS: Record<MembershipTier, string> = {
  standard: "Member",
  vip: "VIP",
  founding: "Founding Member",
};

const TIER_COLORS: Record<MembershipTier, string> = {
  standard: "rgba(98,243,228,0.15)",
  vip: "rgba(255,171,239,0.15)",
  founding: "rgba(255,200,80,0.15)",
};

const TIER_TEXT: Record<MembershipTier, string> = {
  standard: "#62f3e4",
  vip: "#ffabef",
  founding: "#FFC850",
};

function SectionLabel({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 h-px w-6 bg-[#62f3e4]" />
      <div className="mb-0.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#62f3e4]">
        {eyebrow}
      </div>
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
  );
}

function LockedContentCard({
  label,
  index,
}: {
  label: string;
  index: number;
}) {
  const hues = ["#1a1a2e", "#0f1a2e", "#1a1e2e"];
  const bg = hues[index % hues.length];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        width: 180,
        height: 180,
        background: bg,
        border: "1px solid rgba(98,243,228,0.12)",
        flexShrink: 0,
      }}
    >
      {/* teal tint overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 30%, rgba(98,243,228,0.08) 0%, transparent 60%)",
        }}
      />
      {/* subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 32px)`,
        }}
      />
      {/* lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(98,243,228,0.10)", border: "1px solid rgba(98,243,228,0.20)" }}
        >
          <Lock size={16} className="text-[#62f3e4]/60" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
          {label}
        </span>
      </div>
    </div>
  );
}

function VideoPlaceholderCard({ index }: { index: number }) {
  const gradients = [
    "linear-gradient(135deg, #0d1a2e 0%, #1a0d2e 100%)",
    "linear-gradient(135deg, #0d2e1a 0%, #0d1a2e 100%)",
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        aspectRatio: "16/9",
        background: gradients[index % gradients.length],
        border: "1px solid rgba(98,243,228,0.10)",
        width: "100%",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(98,243,228,0.06) 0%, transparent 60%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 48px)`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full"
          style={{
            background: "rgba(98,243,228,0.10)",
            border: "1px solid rgba(98,243,228,0.20)",
          }}
        >
          <Play size={18} className="text-[#62f3e4]/60" fill="currentColor" />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
          Coming Soon
        </span>
      </div>
    </div>
  );
}

function ArtworkPlaceholderCard({
  index,
  large,
}: {
  index: number;
  large?: boolean;
}) {
  const bgs = ["#1a0d2e", "#0d1a1a", "#1a1a0d"];
  const tints = [
    "radial-gradient(ellipse at 20% 80%, rgba(255,171,239,0.07) 0%, transparent 55%)",
    "radial-gradient(ellipse at 80% 20%, rgba(98,243,228,0.07) 0%, transparent 55%)",
    "radial-gradient(ellipse at 50% 50%, rgba(98,243,228,0.05) 0%, transparent 55%)",
  ];

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: bgs[index % bgs.length],
        border: "1px solid rgba(255,255,255,0.07)",
        aspectRatio: large ? "1/1.2" : "1/1",
      }}
    >
      <div className="absolute inset-0" style={{ background: tints[index % tints.length] }} />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 20px)`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[8px] uppercase tracking-[0.3em] text-white/15">
          Coming Soon
        </span>
      </div>
    </div>
  );
}

export function FanClubHubClient({ user, member }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => setMounted(true), []);

  const tier: MembershipTier = member?.membership_tier ?? "standard";
  const displayName =
    member?.display_name ||
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Member";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/fan-club/login");
  }

  return (
    <div className="min-h-screen px-4 pb-24 pt-6 md:px-8 md:pt-10">

      {/* ── WELCOME HEADER ── */}
      <motion.div
        className="mb-12 flex items-start justify-between"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[#62f3e4]">
            Nano Techians Fan Club
          </div>
          <h1 className="text-3xl font-black tracking-tight leading-tight text-white md:text-5xl">
            Welcome back,{" "}
            <span className="text-white">{displayName}</span>
            <span className="text-[#62f3e4]">.</span>
          </h1>
          <div className="mt-4 flex items-center gap-3">
            <span
              className="rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] font-semibold"
              style={{
                background: TIER_COLORS[tier],
                color: TIER_TEXT[tier],
                border: `1px solid ${TIER_TEXT[tier]}33`,
              }}
            >
              {TIER_LABELS[tier]}
            </span>
            {member?.joined_at && (
              <span className="font-mono text-[10px] text-white/30">
                Since{" "}
                {new Date(member.joined_at).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        <motion.button
          onClick={handleLogout}
          className="mt-1 flex items-center gap-1.5 rounded-full border border-white/[0.08] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/30 transition-colors hover:border-white/20 hover:text-white/55"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <LogOut size={11} />
          Sign Out
        </motion.button>
      </motion.div>

      {/* ── EXCLUSIVE MUSIC ── */}
      <motion.section
        className="mb-14"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.08 }}
      >
        <div className="mb-6">
          <SectionLabel eyebrow="Members Only" title="Exclusive Tracks" />
        </div>
        <div className="-mx-4 overflow-x-auto px-4 md:-mx-8 md:px-8">
          <div className="flex gap-5 pb-2">
            {[
              "Unreleased Track",
              "Studio Session",
              "Demo Cut",
            ].map((label, i) => (
              <LockedContentCard key={i} label={label} index={i} />
            ))}
          </div>
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/25 uppercase tracking-wider">
          Exclusive content drops soon — founding members get first access.
        </p>
      </motion.section>

      {/* ── MERCH DROP ── */}
      <motion.section
        className="mb-14"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.13 }}
      >
        <div className="mb-6">
          <SectionLabel eyebrow="Fan Store" title="Merch Drop" />
        </div>
        <div
          className="relative overflow-hidden rounded-2xl p-8 md:p-10"
          style={{
            background: "linear-gradient(135deg, #1a0d2e 0%, #0d0d1a 60%, #0a1a18 100%)",
            border: "1px solid rgba(98,243,228,0.10)",
          }}
        >
          {/* grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `repeating-linear-gradient(0deg, #62f3e4 0px, #62f3e4 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #62f3e4 0px, #62f3e4 1px, transparent 1px, transparent 40px)`,
            }}
          />
          <div className="relative">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.32em] text-[#62f3e4]/60">
              Nano Techians × Printify
            </div>
            <h3 className="mb-3 text-2xl font-black text-white md:text-3xl">
              Your Store Is Coming
            </h3>
            <p className="mb-4 max-w-md text-sm leading-relaxed text-white/45">
              Exclusive merch designed for the inner circle. Founding members get
              first access and a private discount.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-xs text-white/40"
              style={{
                background: "rgba(98,243,228,0.06)",
                border: "1px solid rgba(98,243,228,0.15)",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#62f3e4]/40" />
              Opening Soon
            </div>
          </div>
          {/* owner setup notice */}
          <p
            className="absolute bottom-3 right-4 font-mono text-[9px] text-white/[0.15]"
            style={{ fontFamily: "'Space Mono', monospace" }}
          >
            ⚠ Owner: connect PRINTIFY_API_TOKEN + PRINTIFY_SHOP_ID env vars to activate
          </p>
        </div>
      </motion.section>

      {/* ── EXCLUSIVE VIDEOS ── */}
      <motion.section
        className="mb-14"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.18 }}
      >
        <div className="mb-6">
          <SectionLabel eyebrow="Behind The Scenes" title="Videos" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <VideoPlaceholderCard key={i} index={i} />
          ))}
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/25 uppercase tracking-wider">
          Studio sessions and behind-the-scenes footage coming soon.
        </p>
      </motion.section>

      {/* ── DIGITAL ARTWORK ── */}
      <motion.section
        className="mb-10"
        initial={{ opacity: 0, y: 14 }}
        animate={mounted ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.23 }}
      >
        <div className="mb-6">
          <SectionLabel eyebrow="Visual Vault" title="Artwork" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <ArtworkPlaceholderCard index={0} large />
          </div>
          <div className="col-span-1 flex flex-col gap-3">
            <ArtworkPlaceholderCard index={1} />
            <ArtworkPlaceholderCard index={2} />
          </div>
          <div className="col-span-1">
            <ArtworkPlaceholderCard index={0} large />
          </div>
        </div>
        <p className="mt-4 font-mono text-[10px] text-white/25 uppercase tracking-wider">
          High-resolution digital artwork and collectibles coming soon.
        </p>
      </motion.section>
    </div>
  );
}
