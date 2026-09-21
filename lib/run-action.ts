import "server-only";
import { GENERIC_ERROR_MESSAGE, UserError, type ActionResult } from "@/lib/errors";
import { reportError } from "@/lib/error-log";

/**
 * Wraps a Server Action body: expected problems (UserError) come back as a customer-safe
 * message; anything else is logged for admins and the customer gets the generic message
 * with a reference they can quote to support.
 */
export async function runAction<T>(source: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof UserError) return { ok: false, message: err.message };
    const ref = await reportError({ source: `action:${source}`, error: err });
    return { ok: false, message: GENERIC_ERROR_MESSAGE, ref };
  }
}
