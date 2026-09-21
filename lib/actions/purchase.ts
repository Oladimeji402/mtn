"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { mapVtuOrderOutcome, purchaseMtnData as purchaseVtuData, requeryVtuOrder, VtuApiError } from "@/lib/vtu";
import { purchaseMtnData as purchaseSmeData, requerySmeOrder, isSmeInsufficientBalance, SmeDataApiError } from "@/lib/smedata";
import { notifyAdmins } from "@/lib/notify-admins";
import { assertNotRateLimited } from "@/lib/rate-limit";
import { getTransaction } from "@/lib/services/transactions";
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
    return;
  }
  if (isSmeInsufficientBalance(err)) {
    await notifyAdmins({
      type: "sme_balance_low",
      title: "SMEData.ng wallet is out of funds",
      message: "A customer purchase just failed because Bunben's SMEData.ng wallet balance is too low. Fund it directly on smedata.ng.",
    });
  }
}

/**
 * SMEData.ng has no pricing API (see migration 0020's comment) — a real purchase's charged
 * amount is the only live signal available that the retail price might need updating. Not
 * urgent enough to block the purchase itself on; runs after the customer already has their
 * outcome.
 */
async function checkSmePriceDrift(plan: { id: string; reseller_cost: number | null }, chargedAmount: number | null) {
  if (plan.reseller_cost === null || chargedAmount === null) return;
  if (Math.abs(chargedAmount - plan.reseller_cost) < 1) return;

  await notifyAdmins({
    type: "plan_price_drift",
    title: "SMEData.ng price changed",
    message: `${plan.id}: expected to be charged ₦${plan.reseller_cost.toLocaleString()} but SMEData charged ₦${chargedAmount.toLocaleString()}. Update this plan's price in Supabase (data_plans) to keep your margin.`,
  });
}

function mapCreatePurchaseError(message: string): string {
  if (message.includes("INSUFFICIENT_BALANCE")) return "Insufficient wallet balance.";
  if (message.includes("INVALID_PLAN")) return "This data plan is no longer available.";
  if (message.includes("PLAN_EXCEEDS_MAXIMUM")) return "This plan exceeds the maximum allowed per purchase.";
  if (message.includes("WALLET_NOT_FOUND")) return "Wallet not found.";
  if (message.includes("NOT_AUTHENTICATED")) return "Not authenticated";
  return "Could not start purchase. Please try again.";
}

export async function purchaseDataAction(input: {
  phoneNumber: string;
  dataPlanId: string;
}): Promise<Transaction> {
  const supabase = await createClient();
  await assertNotRateLimited("purchase_data", 10, 300);

  const { data: plan } = await supabase
    .from("data_plans")
    .select("id, price, vtu_variation_id, provider, sme_size_code, reseller_cost")
    .eq("id", input.dataPlanId)
    .eq("active", true)
    .maybeSingle();
  if (!plan) throw new Error("This data plan is no longer available.");
  if (plan.provider === "vtu" && !plan.vtu_variation_id) {
    throw new Error("This plan isn't linked to a provider yet — contact support.");
  }
  if (plan.provider === "smedata" && !plan.sme_size_code) {
    throw new Error("This plan isn't linked to a provider yet — contact support.");
  }

  const reference = generateReference("DAT");
  const admin = createAdminClient();

  const { data: purchase, error } = await supabase.rpc("fn_create_purchase", {
    p_type: "data",
    p_network: "MTN",
    p_phone_number: input.phoneNumber,
    p_amount: plan.price,
    p_data_plan_id: plan.id,
    p_reference: reference,
  });
  if (error) throw new Error(mapCreatePurchaseError(error.message));

  if (plan.provider === "smedata") {
    try {
      const order = await purchaseSmeData({ phone: input.phoneNumber, sizeCode: plan.sme_size_code! });
      // Recorded immediately, not just at finalization — this is the only way the webhook
      // (app/api/webhooks/smedata/route.ts) or a later manual "Check status" can find this
      // purchase again when the initial call comes back "processing".
      if (order.orderId !== null) {
        await admin.from("purchases").update({ provider_reference: String(order.orderId) }).eq("id", purchase.id);
      }
      if (order.outcome !== "pending") {
        if (order.outcome === "failed") {
          await notifyAdminsIfProviderOutOfFunds(new SmeDataApiError(order.message));
        } else {
          await checkSmePriceDrift(plan, order.chargedAmount);
        }
        await finalizePurchase({
          purchaseId: purchase.id,
          outcome: order.outcome,
          providerReference: order.orderId !== null ? String(order.orderId) : null,
          failureReason: order.outcome === "failed" ? `SMEData: ${order.message}` : null,
        });
      }
    } catch (err) {
      // No request-id/idempotency support on SMEData's side (see lib/smedata.ts) — a thrown
      // error here means we genuinely don't know if the order was placed, same unresolved
      // edge case the VTU path below already accepts. Not auto-retried either way.
      await notifyAdminsIfProviderOutOfFunds(err);
      await finalizePurchase({
        purchaseId: purchase.id,
        outcome: "failed",
        providerReference: null,
        failureReason: err instanceof Error ? err.message : "SMEData request failed",
      });
    }

    const result = await getTransaction(purchase.id);
    if (!result) throw new Error("Purchase not found after processing.");
    return result;
  }

  try {
    const order = await purchaseVtuData({
      requestId: reference,
      phone: input.phoneNumber,
      variationId: plan.vtu_variation_id!,
    });
    const outcome = mapVtuOrderOutcome(order.status);
    if (outcome !== "pending") {
      await finalizePurchase({
        purchaseId: purchase.id,
        outcome,
        providerReference: String(order.order_id),
        failureReason: outcome === "failed" ? `VTU order ${order.status}` : null,
      });
    }
  } catch (err) {
    await notifyAdminsIfProviderOutOfFunds(err);
    await finalizePurchase({
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

/** Manual reconciliation for a purchase stuck in 'processing'. VTU.ng's webhook only fires
 *  for refunds and manually-completed orders, not normal automated completions; SMEData's
 *  webhook has no signature so this requery path is the trustworthy source for it too. */
export async function requeryPurchaseAction(purchaseId: string): Promise<Transaction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, reference, user_id, status, data_plan_id, provider_reference")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!purchase || purchase.user_id !== user.id) throw new Error("Purchase not found.");

  if (purchase.status === "processing") {
    let provider: "vtu" | "smedata" = "vtu";
    if (purchase.data_plan_id) {
      const { data: plan } = await admin
        .from("data_plans")
        .select("provider")
        .eq("id", purchase.data_plan_id)
        .maybeSingle();
      if (plan?.provider === "smedata") provider = "smedata";
    }

    if (provider === "smedata") {
      if (purchase.provider_reference) {
        const order = await requerySmeOrder(purchase.provider_reference);
        if (order.outcome !== "pending") {
          await finalizePurchase({
            purchaseId: purchase.id,
            outcome: order.outcome,
            providerReference: purchase.provider_reference,
            failureReason: order.outcome === "failed" ? `SMEData: ${order.message}` : null,
          });
        }
      }
    } else {
      const order = await requeryVtuOrder(purchase.reference);
      const outcome = mapVtuOrderOutcome(order.status);
      if (outcome !== "pending") {
        await finalizePurchase({
          purchaseId: purchase.id,
          outcome,
          providerReference: String(order.order_id),
          failureReason: outcome === "failed" ? `VTU order ${order.status}` : null,
        });
      }
    }
  }

  const result = await getTransaction(purchaseId);
  if (!result) throw new Error("Purchase not found.");
  return result;
}
