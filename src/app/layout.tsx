import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "@/styles/globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { PlayerBar } from "@/components/layout/PlayerBar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { FullScreenPlayer } from "@/components/layout/FullScreenPlayer";
import { LyricsModal } from "@/components/layout/LyricsModal";
import { TapToStartBanner } from "@/components/layout/TapToStartBanner";
import { SWUpdateBanner } from "@/components/layout/SWUpdateBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CheckoutHost } from "@/components/paypal/CheckoutHost";
import { PageTransition } from "@/components/layout/PageTransition";
import { AnalyticsProvider } from "@/providers/AnalyticsProvider";
import { getAlbums } from "@/lib/queries";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.nanotechvibe.com"),
  title: {
    default: "NTV Vault | Nano Tech Vibe",
    template: "%s | NTV Vault",
  },
  description: "The official Nano Tech Vibe music store.",
  manifest: "/manifest.json",
  openGraph: {
    type: "music.album",
    siteName: "NTV Vault",
    url: "https://www.nanotechvibe.com",
    title: "NTV Vault | Nano Tech Vibe",
    description: "The official Nano Tech Vibe music store.",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NTV Vault | Nano Tech Vibe",
    description: "The official Nano Tech Vibe music store.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { albums: sidebarAlbums } = await getAlbums({ page: 1, limit: 50 });

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-[#393838] text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[1000] focus:rounded focus:bg-[#3DD6C8] focus:px-4 focus:py-2 focus:font-semibold focus:text-black focus:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            <PlayerProvider>
              <div style={{ display: "flex", height: "100vh", flexDirection: "column" }}>
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                  <Sidebar initialAlbums={sidebarAlbums} />
                  <main
                    id="main-content"
                    tabIndex={-1}
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      background: "#393838",
                      position: "relative",
                    }}
                  >
                    <TopBar />
                    <PageTransition>{children}</PageTransition>
                    <SiteFooter />
                  </main>
                </div>
                <MobileTabBar />
                <PlayerBar />
              </div>
              <FullScreenPlayer />
              <LyricsModal />
              <TapToStartBanner />
              <SWUpdateBanner />
              <CheckoutHost />
            </PlayerProvider>
          </AnalyticsProvider>
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
