import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client. Bypasses Row Level Security entirely.
 *
 * Use ONLY for: webhook handlers (crediting wallets after payment verification),
 * and admin actions that must read/write across all users (user management, audit log).
 *
 * NEVER import this from a Client Component — the `server-only` import above makes
 * that a build-time error, not a runtime surprise.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (server-only, never commit it).",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
