import * as Sentry from "@sentry/nextjs";

export type LogContext = Record<string, unknown>;

/**
 * Captures an exception in Sentry and emits a console.error for server logs.
 * On the server, caller can additionally invoke logAuditEvent() for audit-trail
 * coverage — logger.ts deliberately avoids importing audit.ts so this module
 * stays safe to import in client components as well.
 */
export function logError(error: unknown, context?: LogContext): void {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : JSON.stringify(error));

  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });

  console.error(err.message, context ?? "");
}

/** Captures a warning-level message in Sentry and emits console.warn. */
export function logWarning(message: string, context?: LogContext): void {
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureMessage(message, "warning");
  });
  console.warn(message, context ?? "");
}

/**
 * Informational log — console only.
 * For server-side audit trail, call logAuditEvent() directly from server code.
 */
export function logInfo(message: string, context?: LogContext): void {
  console.info(message, context ?? "");
}
