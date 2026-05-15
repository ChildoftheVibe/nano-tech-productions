import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  debug: false,
  // Capture PayPal and Supabase connection errors with full context
  beforeSend(event) {
    // Strip sensitive headers before sending to Sentry
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
      delete event.request.headers["x-admin-token"];
    }
    return event;
  },
});
