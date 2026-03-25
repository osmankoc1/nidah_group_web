/**
 * Next.js instrumentation hook — called once when the server starts.
 * Required by @sentry/nextjs v8+ for server-side and edge SDK initialization.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
