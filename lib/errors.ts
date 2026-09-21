/** Shown to a customer for anything unexpected — never the underlying cause. */
export const GENERIC_ERROR_MESSAGE = "Something went wrong on our side. Please try again in a moment.";

/**
 * An expected, customer-safe problem (insufficient balance, plan no longer available, too
 * many attempts). Its message is shown to the customer exactly as written, so it must never
 * contain provider names, balances of ours, or internals. Anything else that gets thrown is
 * treated as unexpected: logged for admins, and the customer sees the generic message.
 */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

/**
 * Server Actions return this instead of throwing. React strips the message off any thrown
 * error before it reaches the browser in production, so a thrown "Insufficient balance"
 * would never actually arrive — expected errors have to travel as values.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string; ref?: string };

/** Message plus the support reference, when the failure was unexpected and got logged. */
export function errorText(result: { message: string; ref?: string }): string {
  return result.ref ? `${result.message} (Ref: ${result.ref})` : result.message;
}
