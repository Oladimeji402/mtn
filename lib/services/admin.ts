import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminDashboardStats, AdminUser, PlatformSettings } from "@/types";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const admin = createAdminClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfDayIso = startOfDay.toISOString();

  const [
    { count: totalUsers },
    { count: activeUsers },
    { data: todayPurchases },
    { data: todayFunding },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("purchases").select("type, status, amount").gte("created_at", startOfDayIso),
    admin
      .from("wallet_ledger")
      .select("amount")
      .eq("type", "funding")
      .eq("status", "successful")
      .gte("created_at", startOfDayIso),
  ]);

  const purchases = todayPurchases ?? [];
  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    transactionsToday: purchases.length,
    successfulTransactions: purchases.filter((p) => p.status === "successful").length,
    failedTransactions: purchases.filter((p) => p.status === "failed").length,
    pendingTransactions: purchases.filter((p) => p.status === "pending").length,
    airtimeSalesToday: purchases
      .filter((p) => p.type === "airtime" && p.status === "successful")
      .reduce((sum, p) => sum + p.amount, 0),
    dataSalesToday: purchases
      .filter((p) => p.type === "data" && p.status === "successful")
      .reduce((sum, p) => sum + p.amount, 0),
    walletFundingToday: (todayFunding ?? []).reduce((sum, f) => sum + f.amount, 0),
  };
}

export async function getCurrentAdmin(): Promise<AdminUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const [{ data: profile }, { data: adminRow }] = await Promise.all([
    supabase.from("profiles").select("username, email").eq("id", user.id).single(),
    supabase.from("admin_users").select("role").eq("user_id", user.id).single(),
  ]);

  if (!profile || !adminRow) throw new Error("Not an admin");

  return {
    id: user.id,
    username: profile.username,
    email: profile.email,
    role: adminRow.role,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("minimum_funding_amount")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to load settings");

  return {
    minimumFundingAmount: data.minimum_funding_amount,
  };
}

/** Admin-only: checked via is_admin() RPC (RLS-respecting) before the privileged write. */
export async function updatePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor) throw new Error("Not authenticated");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not authorized");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_settings")
    .update({
      minimum_funding_amount: settings.minimumFundingAmount,
      updated_by: actor.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select("minimum_funding_amount")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to save settings");

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_type: "admin",
    action: "update_platform_settings",
    entity_type: "platform_settings",
    metadata: { ...settings },
  });

  return {
    minimumFundingAmount: data.minimum_funding_amount,
  };
}
