import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationTypeDb } from "@/lib/supabase/database.types";

/**
 * Notifies every admin via the same in-app notification system regular users see — an
 * admin has their own profile/user_id like anyone else, so this reuses the existing
 * `notifications` table and UI rather than inventing a separate admin-alerts surface.
 *
 * Skips an admin who already has an unread notification of this exact type — one
 * outstanding alert is enough; this can be called on every failed purchase attempt or
 * every cron run without spamming a resolved/unaddressed warning into a dozen copies.
 */
export async function notifyAdmins(params: {
  type: NotificationTypeDb;
  title: string;
  message: string;
}) {
  const admin = createAdminClient();

  const { data: admins } = await admin.from("admin_users").select("user_id");
  if (!admins?.length) return;

  const adminIds = admins.map((a) => a.user_id);
  const { data: existing } = await admin
    .from("notifications")
    .select("user_id")
    .eq("type", params.type)
    .eq("read", false)
    .in("user_id", adminIds);

  const alreadyNotified = new Set((existing ?? []).map((n) => n.user_id));
  const recipients = adminIds.filter((id) => !alreadyNotified.has(id));
  if (!recipients.length) return;

  await admin.from("notifications").insert(
    recipients.map((user_id) => ({
      user_id,
      type: params.type,
      title: params.title,
      message: params.message,
    })),
  );
}
