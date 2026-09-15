import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUserDetail, AdminUserListItem, User } from "@/types";

function toUser(row: {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  status: "active" | "disabled";
  created_at: string;
}): User {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    phone: row.phone ?? undefined,
    status: row.status,
    emailVerified: true, // if they have a session, Supabase already confirmed their email
    createdAt: row.created_at,
  };
}

/** Reads the signed-in user's own profile. Requires an authenticated session (RLS-scoped). */
export async function getCurrentUser(): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, email, phone, status, created_at")
    .eq("id", authUser.id)
    .single();

  if (error || !data) throw new Error("Profile not found");
  return toUser(data);
}

export async function getUser(id: string): Promise<User | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, email, phone, status, created_at")
    .eq("id", id)
    .maybeSingle();

  return data ? toUser(data) : null;
}

/** Admin-only: full user roster with wallet balance, usage, and transaction counts. */
export async function getUsers(): Promise<AdminUserListItem[]> {
  const admin = createAdminClient();

  const [{ data: profiles, error }, { data: wallets }, { data: purchases }] = await Promise.all([
    admin.from("profiles").select("id, username, email, phone, status, created_at"),
    admin.from("wallets").select("user_id, balance"),
    admin.from("purchases").select("user_id, type, data_plan_id, status, created_at, data_plans(size_in_mb)"),
  ]);

  if (error || !profiles) throw new Error("Failed to load users");

  const balanceByUser = new Map((wallets ?? []).map((w) => [w.user_id, w.balance]));
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const txCountByUser = new Map<string, number>();
  const dailyMbByUser = new Map<string, number>();
  const monthlyMbByUser = new Map<string, number>();

  for (const p of purchases ?? []) {
    txCountByUser.set(p.user_id, (txCountByUser.get(p.user_id) ?? 0) + 1);
    if (p.type !== "data") continue;
    if (!["successful", "processing"].includes(p.status)) continue;
    const sizeMb = (p as { data_plans?: { size_in_mb: number } | null }).data_plans?.size_in_mb ?? 0;
    const createdAt = new Date(p.created_at);
    if (createdAt >= startOfDay) {
      dailyMbByUser.set(p.user_id, (dailyMbByUser.get(p.user_id) ?? 0) + sizeMb);
    }
    if (createdAt >= startOfMonth) {
      monthlyMbByUser.set(p.user_id, (monthlyMbByUser.get(p.user_id) ?? 0) + sizeMb);
    }
  }

  return profiles.map((row) => ({
    ...toUser(row),
    walletBalance: balanceByUser.get(row.id) ?? 0,
    transactionCount: txCountByUser.get(row.id) ?? 0,
    dailyUsageMB: dailyMbByUser.get(row.id) ?? 0,
    monthlyUsageMB: monthlyMbByUser.get(row.id) ?? 0,
  }));
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, email, phone, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;

  const [{ data: wallet }, { data: purchases }, { data: walletHistory }] = await Promise.all([
    admin.from("wallets").select("balance").eq("user_id", id).maybeSingle(),
    admin
      .from("purchases")
      .select("*, data_plans(id, size, validity_days, size_in_mb)")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    admin.from("wallet_ledger").select("*").eq("user_id", id).order("created_at", { ascending: false }),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let dailyUsageMB = 0;
  let monthlyUsageMB = 0;

  const transactions = (purchases ?? []).map((p) => {
    const plan = (
      p as {
        data_plans?: { id: string; size: string; validity_days: number; size_in_mb: number } | null;
      }
    ).data_plans;
    if (p.type === "data" && ["successful", "processing"].includes(p.status) && plan) {
      const createdAt = new Date(p.created_at);
      if (createdAt >= startOfDay) dailyUsageMB += plan.size_in_mb;
      if (createdAt >= startOfMonth) monthlyUsageMB += plan.size_in_mb;
    }
    return {
      id: p.id,
      reference: p.reference,
      userId: p.user_id,
      type: p.type,
      network: "MTN" as const,
      phoneNumber: p.phone_number,
      amount: p.amount,
      dataPlan: plan ? { id: plan.id, size: plan.size, validityLabel: `${plan.validity_days} days` } : null,
      status: p.status,
      statusMessage: p.status_message ?? undefined,
      walletBalanceBefore: p.wallet_balance_before,
      walletBalanceAfter: p.wallet_balance_after,
      createdAt: p.created_at,
      completedAt: p.completed_at,
      providerReference: p.provider_reference,
      failureReason: p.failure_reason,
    };
  });

  return {
    ...toUser(profile),
    walletBalance: wallet?.balance ?? 0,
    transactionCount: transactions.length,
    dailyUsageMB,
    monthlyUsageMB,
    transactions,
    walletHistory: (walletHistory ?? []).map((w) => ({
      id: w.id,
      reference: w.reference,
      userId: w.user_id,
      type: w.type,
      direction: w.direction,
      amount: w.amount,
      balanceBefore: w.balance_before,
      balanceAfter: w.balance_after,
      status: w.status,
      description: w.description,
      createdAt: w.created_at,
      relatedTransactionId: w.related_purchase_id,
    })),
  };
}

/**
 * Admin-only: enable/disable a user. The admin's own session is checked via
 * is_admin() (RLS-respecting) before any privileged write happens — the
 * service-role write below trusts that check, it does not repeat it.
 */
export async function setUserStatus(id: string, status: User["status"]): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor) throw new Error("Not authenticated");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("Not authorized");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ status })
    .eq("id", id)
    .select("id, username, email, phone, status, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to update user status");

  await admin.from("audit_log").insert({
    actor_id: actor.id,
    actor_type: "admin",
    action: status === "active" ? "enable_user" : "disable_user",
    entity_type: "profile",
    entity_id: id,
  });

  return toUser(data);
}
