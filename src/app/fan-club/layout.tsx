import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nano Techians | Fan Club",
  robots: { index: false, follow: false },
};

export default function FanClubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
