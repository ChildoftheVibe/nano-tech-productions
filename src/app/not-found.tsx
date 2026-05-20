import Link from "next/link";

export const metadata = { title: "404 · Not Found · NTV Vault" };

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16 text-center">
      <h1
        className="ntv-glitch font-mono text-[#3DD6C8]"
        style={{
          fontSize: "clamp(96px, 22vw, 220px)",
          fontWeight: 800,
          letterSpacing: "0.04em",
          lineHeight: 1,
        }}
        aria-label="404"
      >
        404
      </h1>
      <p className="mt-6 text-xl font-bold text-white md:text-2xl">
        This frequency doesn&rsquo;t exist
      </p>
      <p className="mt-2 max-w-md text-sm text-[#B3B3B3]">
        The track you&rsquo;re looking for may have been moved.
      </p>
      <Link
        href="/"
        className="ntv-btn mt-8 inline-flex items-center justify-center rounded-full px-6 py-2 text-sm font-bold text-black transition-transform hover:scale-105"
        style={{ background: "#3DD6C8" }}
      >
        Return to Vault
      </Link>
    </div>
  );
}
