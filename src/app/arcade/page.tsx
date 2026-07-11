import type { Metadata } from "next";
import { ArcadePageClient } from "@/components/games/ArcadePageClient";

export const metadata: Metadata = {
  title: "Neon Arcade - NTV Vault",
  description:
    "Play free skill-based arcade cabinets, including Tetra Vault, Vault Runner, Star Vanguard, and Tank Wars, to win Nano Bucks.",
};

export default function ArcadePage() {
  return <ArcadePageClient />;
}
