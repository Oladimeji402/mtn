import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-user throttle for the actions that either spend real money (VTU purchases) or hit
 * a paid third-party API (Monipay initialize). Uses the RLS-scoped client so it's scoped
 * to the calling user via auth.uid() inside fn_check_rate_limit — a user can't throttle
 * or bypass another user's limit. Throws a friendly message on the client side; the raw
 * "RATE_LIMITED" exception text never reaches the UI.
 */
export async function assertNotRateLimited(action: string, maxAttempts: number, windowSeconds: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_check_rate_limit", {
    p_action: action,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });
  if (error?.message.includes("RATE_LIMITED")) {
    throw new Error("Too many attempts. Please wait a few minutes and try again.");
  }
  if (error) {
    throw new Error("Could not process your request. Please try again.");
  }
}
