import { createClient } from "@/lib/supabase/server";
import type { Wallet, WalletTransaction } from "@/types";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function getWallet(): Promise<Wallet> {
  const { supabase, userId } = await currentUserId();
  const { data, error } = await supabase
    .from("wallets")
    .select("user_id, balance, currency, updated_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) throw new Error("Wallet not found");
  return {
    userId: data.user_id,
    balance: data.balance,
    currency: "NGN",
    updatedAt: data.updated_at,
  };
}

export async function getWalletHistory(): Promise<WalletTransaction[]> {
  const { supabase, userId } = await currentUserId();
  const { data, error } = await supabase
    .from("wallet_ledger")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
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
  }));
}

export async function getWalletTransaction(id: string): Promise<WalletTransaction | null> {
  const { supabase, userId } = await currentUserId();
  const { data } = await supabase
    .from("wallet_ledger")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    reference: data.reference,
    userId: data.user_id,
    type: data.type,
    direction: data.direction,
    amount: data.amount,
    balanceBefore: data.balance_before,
    balanceAfter: data.balance_after,
    status: data.status,
    description: data.description,
    createdAt: data.created_at,
    relatedTransactionId: data.related_purchase_id,
  };
}
