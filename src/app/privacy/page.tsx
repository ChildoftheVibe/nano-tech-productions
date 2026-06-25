import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy · NTV Vault",
  description:
    "What we collect, what we don't, and how we use it at Nano Tech Vibe.",
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-white md:px-8 md:py-16">
      <header className="mb-10">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-white/60">
          Last updated: 2026-05-08
        </p>
      </header>

      <p className="text-sm leading-relaxed text-white/80">
        Nano Tech Vibe (&quot;NTV&quot;, &quot;we&quot;) runs NTV Vault
        without user accounts. We don&apos;t ask you to sign in, and we
        don&apos;t store names, emails, or addresses unless you choose to make a
        purchase. This page explains, in plain language, what we collect when
        you visit the site.
      </p>

      <Section title="What we collect">
        <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-white/80">
          <li>
            <strong className="text-white">Anonymous analytics.</strong> We use
            PostHog and Vercel Analytics to record page views, click positions,
            scroll depth, and product interactions. These are tied to a random
            ID stored in your browser, not to your identity.
          </li>
          <li>
            <strong className="text-white">Audio engagement.</strong> When you
            press play, we record the play start, every ten seconds of
            playback, the moment you skip, and whether you finished a track.
            This helps us understand which songs hold attention.
          </li>
          <li>
            <strong className="text-white">Geographic data.</strong> Country,
            region, and city — derived from your IP address by our hosting
            provider. We do not store your IP itself.
          </li>
          <li>
            <strong className="text-white">Device information.</strong> Browser,
            operating system, and screen size as reported by your browser.
          </li>
          <li>
            <strong className="text-white">Session recordings.</strong> Mouse
            movement, clicks, and scroll behavior are recorded to help us spot
            usability issues. All input fields are masked, so anything you
            type is never captured.
          </li>
          <li>
            <strong className="text-white">Purchase records.</strong> Order ID,
            items purchased, and total amount, retained for tax and download
            entitlement purposes. Payment is handled by PayPal — we never see
            your card details.
          </li>
        </ul>
      </Section>

      <Section title="What we do not collect">
        <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-white/80">
          <li>We do not require accounts, passwords, or email signups.</li>
          <li>We do not use third-party advertising cookies.</li>
          <li>We do not sell or share data with data brokers.</li>
          <li>
            We do not store your full IP address or your name on our servers.
          </li>
        </ul>
      </Section>

      <Section title="Third parties">
        <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-white/80">
          <li>
            <strong className="text-white">PostHog</strong> — analytics and
            session recordings.{" "}
            <a
              className="text-[#62f3e4] underline-offset-2 hover:underline"
              href="https://posthog.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              PostHog privacy policy
            </a>
            .
          </li>
          <li>
            <strong className="text-white">Vercel</strong> — hosting,
            performance metrics, geographic headers.{" "}
            <a
              className="text-[#62f3e4] underline-offset-2 hover:underline"
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel privacy policy
            </a>
            .
          </li>
          <li>
            <strong className="text-white">PayPal</strong> — payment processing.{" "}
            <a
              className="text-[#62f3e4] underline-offset-2 hover:underline"
              href="https://www.paypal.com/us/legalhub/privacy-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              PayPal privacy policy
            </a>
            .
          </li>
          <li>
            <strong className="text-white">Cloudinary</strong> — media CDN and
            storage.{" "}
            <a
              className="text-[#62f3e4] underline-offset-2 hover:underline"
              href="https://cloudinary.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cloudinary privacy policy
            </a>
            .
          </li>
        </ul>
      </Section>

      <Section title="Your choices">
        <p className="text-sm leading-relaxed text-white/80">
          You can disable analytics by enabling Do Not Track in your browser, or
          by blocking PostHog and Vercel domains in a privacy-focused browser
          extension. To request deletion of any data tied to your purchases,
          contact us using the email below with your order ID.
        </p>
      </Section>

      <Section title="Contact">
        <p className="text-sm leading-relaxed text-white/80">
          For data requests or privacy questions, email{" "}
          <a
            className="text-[#62f3e4] underline-offset-2 hover:underline"
            href="mailto:privacy@nanotechproductions.com"
          >
            privacy@nanotechproductions.com
          </a>
          .
        </p>
      </Section>

      <p className="mt-12 text-xs text-white/40">
        See also: <Link href="/terms" className="text-[#62f3e4] hover:underline">Terms of Sale</Link>.
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
