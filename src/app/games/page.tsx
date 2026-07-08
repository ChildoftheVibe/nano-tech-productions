import type { Metadata } from "next";
import { GamesHubClient } from "@/components/games/GamesHubClient";

export const metadata: Metadata = {
  title: "Nano Tech Games — NTV Vault",
  description:
    "Play blackjack, roulette, hold'em and more to win Nano Bucks — then spend them on album and track downloads.",
};

export default function GamesPage() {
  return <GamesHubClient />;
}
