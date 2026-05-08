import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Sale · NTP Vault",
  description: "Terms governing digital music purchases at Nano Tech Productions.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-white md:px-8 md:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold">Terms of Sale</h1>
        <p className="mt-2 text-sm text-white/60">Last updated: 2026-05-08</p>
      </header>

      <p className="text-sm leading-relaxed text-white/80">
        These terms govern your purchase of digital music from Nano Tech
        Productions (&quot;NTP&quot;) through NTP Vault. By completing a
        purchase, you agree to the terms below.
      </p>

      <Section title="Digital purchases are final">
        <p className="text-sm leading-relaxed text-white/80">
          All sales of digital music files are final. Because the product is
          delivered immediately and cannot be returned, we do not offer refunds
          once a download link has been issued. If you encountered a technical
          issue (corrupted file, broken link, double-charge), email us and we
          will resolve it.
        </p>
      </Section>

      <Section title="Download availability">
        <p className="text-sm leading-relaxed text-white/80">
          After successful payment, you will receive single-use download links
          valid for two hours. Each link can be redeemed once. Save your files
          to a backup location after download — we are not responsible for
          files lost on your end. If you need a download re-issued for the
          original purchase, contact us with your order ID.
        </p>
      </Section>

      <Section title="License and acceptable use">
        <p className="text-sm leading-relaxed text-white/80">
          When you purchase a track or album, you receive a personal,
          non-exclusive, non-transferable license to use the music for private,
          non-commercial listening. You may copy the file to your own devices.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-white/80">
          You may not: redistribute the file, share it on file-sharing
          networks, sample or remix it for commercial release, sync it to video
          for monetized publication, or claim authorship. For commercial,
          sync, or sampling licenses, contact us directly.
        </p>
      </Section>

      <Section title="Pricing and currency">
        <p className="text-sm leading-relaxed text-white/80">
          All prices are listed in U.S. Dollars (USD). Your payment provider
          may apply currency conversion or processing fees that we do not
          control.
        </p>
      </Section>

      <Section title="Payment processor">
        <p className="text-sm leading-relaxed text-white/80">
          Payments are processed by PayPal. We do not see or store your card
          details. PayPal&apos;s terms apply to the payment portion of your
          transaction.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p className="text-sm leading-relaxed text-white/80">
          We may update these terms occasionally. The version that applied to
          your purchase is the version live on the site at the time you
          completed checkout. We will not retroactively change the rights
          attached to your existing purchases.
        </p>
      </Section>

      <Section title="Contact">
        <p className="text-sm leading-relaxed text-white/80">
          Questions, support, or licensing inquiries:{" "}
          <a
            className="text-[#3DD6C8] underline-offset-2 hover:underline"
            href="mailto:support@nanotechproductions.com"
          >
            support@nanotechproductions.com
          </a>
          .
        </p>
      </Section>

      <p className="mt-12 text-xs text-white/40">
        See also:{" "}
        <Link href="/privacy" className="text-[#3DD6C8] hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}
