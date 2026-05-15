import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  debug: false,
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    // Browser extensions and third-party scripts
    /^Script error\.$/,
    /^Non-Error promise rejection captured/,
  ],
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
});
