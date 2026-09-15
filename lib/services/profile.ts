"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Self-service profile update, called directly from the browser client.
 * RLS (profiles_update_own + the restrict-update trigger) already limits this
 * to username/phone — email and status are not editable this way by design.
 */
export async function updateOwnProfile(userId: string, values: { username: string; phone?: string }) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username: values.username, phone: values.phone ?? null })
    .eq("id", userId);

  if (error) {
    if (error.message.includes("duplicate key")) {
      throw new Error("That username is already taken.");
    }
    throw new Error(error.message);
  }
  return { success: true as const };
}
