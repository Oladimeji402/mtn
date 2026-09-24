import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/services/admin";

export interface ErrorLogEntry {
  id: string;
  ref: string;
  source: string;
  message: string;
  stack: string | null;
  path: string | null;
  context: Record<string, unknown>;
  createdAt: string;
  username: string | null;
}

/**
 * error_log has no RLS policies on purpose (only the service role can read it), so the admin
 * check has to happen here rather than being left to the database.
 */
export async function getErrorLog(refQuery?: string): Promise<ErrorLogEntry[]> {
  await getCurrentAdmin();
  const admin = createAdminClient();

  let query = admin.from("error_log").select("*").order("created_at", { ascending: false }).limit(200);
  const ref = refQuery?.trim().toUpperCase();
  if (ref) query = query.eq("ref", ref);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load error log: ${error.message}`);
  const rows = data ?? [];

  const userIds = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => !!id))];
  const usernames = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await admin.from("profiles").select("id, username").in("id", userIds);
    for (const p of profiles ?? []) usernames.set(p.id, p.username);
  }

  return rows.map((r) => ({
    id: r.id,
    ref: r.ref,
    source: r.source,
    message: r.message,
    stack: r.stack,
    path: r.path,
    context: r.context,
    createdAt: r.created_at,
    username: r.user_id ? (usernames.get(r.user_id) ?? null) : null,
  }));
}
