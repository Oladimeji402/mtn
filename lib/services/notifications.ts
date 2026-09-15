import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/types";

function toNotification(row: {
  id: string;
  user_id: string;
  type: Notification["type"];
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  };
}

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toNotification);
}

export async function markNotificationRead(id: string): Promise<Notification | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return null;
  return toNotification(data);
}
