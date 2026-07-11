import type { Metadata } from "next";
import { GamesHubClient } from "@/components/games/GamesHubClient";

export const metadata: Metadata = {
  title: "Nano Tech Games — NTV Vault",
  description:
    "Play blackjack, roulette, hold'em and more to win Nano Bucks — then spend them on album and track downloads.",
};

export default function GamesPage() {
  // Preview deployments skip the casino wallet-login gate so testers can
  // reach every game without an OTP round-trip; production is unaffected.
  const isPreview = process.env.VERCEL_ENV === "preview";
  return <GamesHubClient isPreview={isPreview} />;
}
