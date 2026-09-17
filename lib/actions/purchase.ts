"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizeVtuPurchase } from "@/lib/purchase-fulfillment";
import { mapVtuOrderOutcome, purchaseMtnAirtime, purchaseMtnData, requeryVtuOrder, VtuApiError } from "@/lib/vtu";
import { notifyAdmins } from "@/lib/notify-admins";
import { assertNotRateLimited } from "@/lib/rate-limit";
import { getTransaction } from "@/lib/services/transactions";
import { MAX_AIRTIME_AMOUNT, MIN_AIRTIME_AMOUNT } from "@/lib/constants";
import type { Transaction } from "@/types";

function generateReference(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/** A customer's purchase failing because Bunben's own VTU.ng wallet ran dry is an
 *  operational problem, not a customer-facing one — surface it to admins immediately
 *  rather than waiting for the periodic balance-check cron to catch it. */
async function notifyAdminsIfProviderOutOfFunds(err: unknown) {
  if (err instanceof VtuApiError && err.code === "insufficient_funds") {
    await notifyAdmins({
      type: "vtu_balance_low",
      title: "VTU.ng wallet is out of funds",
      message: "A customer purchase just failed because Bunben's VTU.ng wallet balance is too low. Fund it directly on vtu.ng.",
    });
  }
}

function mapCreatePurchaseError(message: string): string {
  if (message.includes("INSUFFICIENT_BALANCE")) return "Insufficient wallet balance.";
  if (message.includes("INVALID_PLAN")) return "This data plan is no longer available.";
  if (message.includes("PLAN_EXCEEDS_MAXIMUM")) return "This plan exceeds the maximum allowed per purchase.";
  if (message.includes("WALLET_NOT_FOUND")) return "Wallet not found.";
  if (message.includes("NOT_AUTHENTICATED")) return "Not authenticated";
  return "Could not start purchase. Please try again.";
}

/**
 * Debits the wallet and creates a 'processing' purchase row first (fn_create_purchase),
 * THEN calls VTU.ng — so if the VTU call itself throws (network error, their API down),
 * the purchase already exists and gets finalized as failed/refunded rather than money
 * silently leaving the wallet with no record of why.
 */
export async function purchaseAirtimeAction(input: {
  phoneNumber: string;
  amount: number;
}): Promise<Transaction> {
  if (input.amount < MIN_AIRTIME_AMOUNT || input.amount > MAX_AIRTIME_AMOUNT) {
    throw new Error(`Amount must be between ₦${MIN_AIRTIME_AMOUNT} and ₦${MAX_AIRTIME_AMOUNT.toLocaleString()}.`);
  }

  const supabase = await createClient();
  await assertNotRateLimited("purchase_airtime", 10, 300);
  const reference = generateReference("AIR");

  const { data: purchase, error } = await supabase.rpc("fn_create_purchase", {
    p_type: "airtime",
    p_network: "MTN",
    p_phone_number: input.phoneNumber,
    p_amount: input.amount,
    p_data_plan_id: null,
    p_reference: reference,
  });
  if (error) throw new Error(mapCreatePurchaseError(error.message));

  try {
    const order = await purchaseMtnAirtime({
      requestId: reference,
      phone: input.phoneNumber,
      amount: input.amount,
    });
    const outcome = mapVtuOrderOutcome(order.status);
    if (outcome !== "pending") {
      await finalizeVtuPurchase({
        purchaseId: purchase.id,
        outcome,
        providerReference: String(order.order_id),
        failureReason: outcome === "failed" ? `VTU order ${order.status}` : null,
      });
    }
  } catch (err) {
    await notifyAdminsIfProviderOutOfFunds(err);
    await finalizeVtuPurchase({
      purchaseId: purchase.id,
      outcome: "failed",
      providerReference: null,
      failureReason: err instanceof Error ? err.message : "VTU request failed",
    });
  }

  const result = await getTransaction(purchase.id);
  if (!result) throw new Error("Purchase not found after processing.");
  return result;
}

export async function purchaseDataAction(input: {
  phoneNumber: string;
  dataPlanId: string;
}): Promise<Transaction> {
  const supabase = await createClient();
  await assertNotRateLimited("purchase_data", 10, 300);

  const { data: plan } = await supabase
    .from("data_plans")
    .select("id, price, vtu_variation_id")
    .eq("id", input.dataPlanId)
    .eq("active", true)
    .maybeSingle();
  if (!plan) throw new Error("This data plan is no longer available.");
  if (!plan.vtu_variation_id) throw new Error("This plan isn't linked to a provider yet — contact support.");

  const reference = generateReference("DAT");

  const { data: purchase, error } = await supabase.rpc("fn_create_purchase", {
    p_type: "data",
    p_network: "MTN",
    p_phone_number: input.phoneNumber,
    p_amount: plan.price,
    p_data_plan_id: plan.id,
    p_reference: reference,
  });
  if (error) throw new Error(mapCreatePurchaseError(error.message));

  try {
    const order = await purchaseMtnData({
      requestId: reference,
      phone: input.phoneNumber,
      variationId: plan.vtu_variation_id,
    });
    const outcome = mapVtuOrderOutcome(order.status);
    if (outcome !== "pending") {
      await finalizeVtuPurchase({
        purchaseId: purchase.id,
        outcome,
        providerReference: String(order.order_id),
        failureReason: outcome === "failed" ? `VTU order ${order.status}` : null,
      });
    }
  } catch (err) {
    await notifyAdminsIfProviderOutOfFunds(err);
    await finalizeVtuPurchase({
      purchaseId: purchase.id,
      outcome: "failed",
      providerReference: null,
      failureReason: err instanceof Error ? err.message : "VTU request failed",
    });
  }

  const result = await getTransaction(purchase.id);
  if (!result) throw new Error("Purchase not found after processing.");
  return result;
}

/** Manual reconciliation for a purchase stuck in 'processing' — VTU.ng's webhook only
 *  fires for refunds and manually-completed orders, not normal automated completions. */
export async function requeryPurchaseAction(purchaseId: string): Promise<Transaction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, reference, user_id, status")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!purchase || purchase.user_id !== user.id) throw new Error("Purchase not found.");

  if (purchase.status === "processing") {
    const order = await requeryVtuOrder(purchase.reference);
    const outcome = mapVtuOrderOutcome(order.status);
    if (outcome !== "pending") {
      await finalizeVtuPurchase({
        purchaseId: purchase.id,
        outcome,
        providerReference: String(order.order_id),
        failureReason: outcome === "failed" ? `VTU order ${order.status}` : null,
      });
    }
  }

  const result = await getTransaction(purchaseId);
  if (!result) throw new Error("Purchase not found.");
  return result;
}
