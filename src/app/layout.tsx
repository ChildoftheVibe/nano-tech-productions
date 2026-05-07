import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlayerBar } from "@/components/layout/PlayerBar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nano Tech Productions",
  description: "NTP — music platform",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#393838] text-white">
        <PlayerProvider>
          <div className="pb-[90px]">{children}</div>
          <PlayerBar />
        </PlayerProvider>
      </body>
    </html>
  );
}
