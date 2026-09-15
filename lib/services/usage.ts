import { createClient } from "@/lib/supabase/server";
import type { Usage } from "@/types";

export async function getUsage(): Promise<Usage> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("fn_get_usage", { p_user_id: user.id }).single();
  if (error || !data) throw new Error(error?.message ?? "Failed to load usage");

  return {
    userId: user.id,
    daily: { usedMB: data.daily_used_mb },
    monthly: { usedMB: data.monthly_used_mb },
    updatedAt: new Date().toISOString(),
  };
}
