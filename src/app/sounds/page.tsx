import type { Metadata } from "next";
import { getInstrumentals } from "@/lib/queries";
import { SoundsClient } from "@/components/sounds/SoundsClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Sounds | NTV Vault",
  description: "Instrumentals by Jhodge — preview and purchase MP3 320 kbps.",
};

export default async function SoundsPage() {
  const initial = await getInstrumentals({ page: 1, limit: 20 });
  return <SoundsClient initial={initial} />;
}
