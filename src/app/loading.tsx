export default function RootLoading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16"
      role="status"
      aria-label="Loading NTV Vault"
    >
      <div
        className="ntv-logo-pulse font-mono font-bold text-[#3DD6C8]"
        style={{ fontSize: 64, letterSpacing: "0.12em" }}
        aria-hidden
      >
        NTV
      </div>
      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-white/40">
        Loading
      </p>
    </div>
  );
}
