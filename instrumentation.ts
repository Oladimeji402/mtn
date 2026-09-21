import type { Instrumentation } from "next";

/**
 * Next.js calls this for any uncaught server error (page render, route handler, proxy,
 * unhandled action). The digest is the same reference the error page shows the customer,
 * so support can search it on the admin Errors page. Expected failures never reach here:
 * Server Actions catch their own via runAction (lib/run-action.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Not real failures: the customer navigated away or lost connection mid-response, or a
  // framework-internal control-flow throw (notFound()/redirect()).
  const message = err instanceof Error ? err.message : String(err);
  if (/destination stream closed early|aborted|socket hang up|ECONNRESET|NEXT_(NOT_FOUND|REDIRECT)/i.test(message)) return;

  const { reportError } = await import("@/lib/error-log");
  const digest =
    typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;

  await reportError({
    source: `${context.routeType}:${context.routePath}`,
    error: err,
    ref: digest,
    path: request.path,
  });
};
