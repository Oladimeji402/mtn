import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminTransaction, Transaction } from "@/types";

type PurchaseRow = {
  id: string;
  reference: string;
  user_id: string;
  type: "airtime" | "data";
  network: string;
  phone_number: string;
  amount: number;
  status: Transaction["status"];
  status_message: string | null;
  wallet_balance_before: number;
  wallet_balance_after: number;
  created_at: string;
  completed_at: string | null;
  provider_reference: string | null;
  failure_reason: string | null;
  data_plans?: { id: string; size: string; validity_days: number } | null;
};

function toTransaction(p: PurchaseRow): Transaction {
  return {
    id: p.id,
    reference: p.reference,
    userId: p.user_id,
    type: p.type,
    network: "MTN",
    phoneNumber: p.phone_number,
    amount: p.amount,
    dataPlan: p.data_plans
      ? {
          id: p.data_plans.id,
          size: p.data_plans.size,
          validityLabel: p.data_plans.validity_days === 1 ? "1 day" : `${p.data_plans.validity_days} days`,
        }
      : null,
    status: p.status,
    statusMessage: p.status_message ?? undefined,
    walletBalanceBefore: p.wallet_balance_before,
    walletBalanceAfter: p.wallet_balance_after,
    createdAt: p.created_at,
    completedAt: p.completed_at,
    providerReference: p.provider_reference,
    failureReason: p.failure_reason,
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("purchases")
    .select("*, data_plans(id, size, validity_days)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => toTransaction(p as PurchaseRow));
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("*, data_plans(id, size, validity_days)")
    .eq("id", id)
    .maybeSingle();

  return data ? toTransaction(data as PurchaseRow) : null;
}

export async function getAdminTransactions(): Promise<AdminTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("purchases")
    .select("*, data_plans(id, size, validity_days), profiles(username)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    ...toTransaction(p as PurchaseRow),
    username: (p as unknown as { profiles?: { username: string } }).profiles?.username ?? "unknown",
  }));
}

export async function getAdminTransaction(id: string): Promise<AdminTransaction | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("purchases")
    .select("*, data_plans(id, size, validity_days), profiles(username)")
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  return {
    ...toTransaction(data as PurchaseRow),
    username: (data as unknown as { profiles?: { username: string } }).profiles?.username ?? "unknown",
  };
}
