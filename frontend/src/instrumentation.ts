import { logger } from "@/lib/logger"

// Next.js calls this for every otherwise-uncaught error during request
// handling (RSC render, Route Handlers, Server Actions) — the log-based
// substitute for a real APM decided on for Fas 2 of the scaling/security
// plan (see CLAUDE.md), instead of adding a paid third-party SaaS (Sentry
// etc.) sight-unseen. Funnels every request error through the same
// structured JSON logger added in Fas 0, so any log aggregator already
// pointed at stdout picks these up without further wiring.
export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string | string[] | undefined> },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  logger.error("unhandled request error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
  })
}
