import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Short, unambiguous code a customer can read out to support (no 0/O/1/I). */
export function newErrorRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const RETENTION_DAYS = 30;

/**
 * Records an unexpected error for the admin Errors page and returns its reference. Never
 * throws — an error-reporting failure must not turn into a second failure for the customer.
 * The console fallback only fires when the database write itself fails, so the error is
 * never silently lost.
 */
export async function reportError(params: {
  source: string;
  error: unknown;
  ref?: string;
  userId?: string | null;
  path?: string;
  context?: Record<string, unknown>;
}): Promise<string> {
  const ref = params.ref ?? newErrorRef();
  const err = params.error;
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack?.slice(0, 4000) : undefined;

  try {
    let userId = params.userId;
    if (userId === undefined) {
      try {
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        userId = data.user?.id ?? null;
      } catch {
        userId = null;
      }
    }

    const admin = createAdminClient();
    const { error } = await admin.from("error_log").insert({
      ref,
      source: params.source,
      message: message.slice(0, 2000),
      stack: stack ?? null,
      user_id: userId ?? null,
      path: params.path ?? null,
      context: params.context ?? {},
    });
    if (error) throw error;

    // Housekeeping without a cron: occasionally drop old rows on a write.
    if (Math.random() < 0.02) {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
      await admin.from("error_log").delete().lt("created_at", cutoff);
    }
  } catch (writeError) {
    console.error(`[error_log write failed] ref=${ref} source=${params.source}`, message, writeError);
  }

  return ref;
}
