import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlayerBar } from "@/components/layout/PlayerBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { CheckoutHost } from "@/components/paypal/CheckoutHost";
import { getAlbums } from "@/lib/queries";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NTP Vault | Nano Tech Productions",
  description: "NTP Vault — the Nano Tech Productions music platform.",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { albums: sidebarAlbums } = await getAlbums({ page: 1, limit: 50 });

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-[#393838] text-white">
        <PlayerProvider>
          <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              <Sidebar initialAlbums={sidebarAlbums} />
              <main
                style={{
                  flex: 1,
                  overflowY: "auto",
                  background: "#393838",
                  position: "relative",
                }}
              >
                <TopBar />
                {children}
              </main>
            </div>
            <PlayerBar />
          </div>
          <CheckoutHost />
        </PlayerProvider>
      </body>
    </html>
  );
}
