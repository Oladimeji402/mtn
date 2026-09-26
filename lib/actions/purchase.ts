"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { mapVtuOrderOutcome, purchaseMtnData as purchaseVtuData, requeryVtuOrder, VtuApiError } from "@/lib/vtu";
import { requerySmeOrder } from "@/lib/smedata";
import { getProvider, applyFulfillmentResult } from "@/lib/fulfillment";
import { reconcileSimPurchase } from "@/lib/fulfillment/sim-pool";
import type { FulfillmentResult } from "@/lib/fulfillment/types";
import { notifyAdmins } from "@/lib/notify-admins";
import { assertNotRateLimited } from "@/lib/rate-limit";
import { UserError, type ActionResult } from "@/lib/errors";
import { reportError } from "@/lib/error-log";
import { runAction } from "@/lib/run-action";
import { canUseTestPlans, isTestPlanId } from "@/lib/test-plans";
import { getTransaction } from "@/lib/services/transactions";
import type { Transaction } from "@/types";

/** A client-generated id for one purchase attempt (a UUID). See purchaseData. */
const IDEMPOTENCY_KEY = /^[A-Za-z0-9-]{16,64}$/;

function generateReference(prefix: string) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/** VTU.ng is switched off, but its original path is kept for old plans and in-flight orders. */
async function notifyIfVtuOutOfFunds(err: unknown) {
  if (err instanceof VtuApiError && err.code === "insufficient_funds") {
    await notifyAdmins({
      type: "vtu_balance_low",
      title: "VTU.ng wallet is out of funds",
      message: "A customer purchase just failed because Bunben's VTU.ng wallet balance is too low. Fund it directly on vtu.ng.",
    });
  }
}

/** Known, customer-safe outcomes of fn_create_purchase; anything else is unexpected. */
function toCreatePurchaseError(message: string): Error {
  if (message.includes("INSUFFICIENT_BALANCE")) return new UserError("Insufficient wallet balance. Please fund your wallet and try again.");
  if (message.includes("INVALID_PLAN")) return new UserError("This data plan is no longer available.");
  if (message.includes("NOT_AUTHENTICATED")) return new UserError("Please log in again to continue.");
  return new Error(`fn_create_purchase failed: ${message}`);
}

export async function purchaseDataAction(input: {
  phoneNumber: string;
  dataPlanId: string;
  /** One UUID per purchase attempt, created by the browser. A repeat (double tap, retry after a
   *  network blip) then returns the original purchase instead of debiting the wallet twice. */
  idempotencyKey?: string;
}): Promise<ActionResult<Transaction>> {
  return runAction("purchaseData", () => purchaseData(input));
}

async function purchaseData(input: { phoneNumber: string; dataPlanId: string; idempotencyKey?: string }): Promise<Transaction> {
  const supabase = await createClient();
  await assertNotRateLimited("purchase_data", 10, 300);

  const { data: plan } = await supabase
    .from("data_plans")
    .select("id, price, size_in_mb, vtu_variation_id, provider, sme_size_code, reseller_cost")
    .eq("id", input.dataPlanId)
    .eq("active", true)
    .maybeSingle();
  if (!plan) throw new UserError("This data plan is no longer available.");
  if (isTestPlanId(plan.id) && !(await canUseTestPlans())) throw new UserError("This data plan is no longer available.");
  if (plan.provider === "vtu" && !plan.vtu_variation_id) {
    throw new Error("This plan isn't linked to a provider yet — contact support.");
  }
  if (plan.provider !== "vtu" && !getProvider(plan.provider)) {
    throw new Error(`No fulfillment provider registered for "${plan.provider}"`);
  }

  const reference =
    input.idempotencyKey && IDEMPOTENCY_KEY.test(input.idempotencyKey)
      ? `DAT-${input.idempotencyKey}`
      : generateReference("DAT");

  const { data: purchase, error } = await supabase.rpc("fn_create_purchase", {
    p_type: "data",
    p_network: "MTN",
    p_phone_number: input.phoneNumber,
    p_amount: plan.price,
    p_data_plan_id: plan.id,
    p_reference: reference,
  });

  if (error) {
    // Unique violation on the reference: this exact attempt already went through. The whole
    // function rolled back, so nothing was debited a second time — hand back the original.
    if (error.code === "23505") {
      const { data: existing } = await supabase.from("purchases").select("id").eq("reference", reference).maybeSingle();
      const original = existing ? await getTransaction(existing.id) : null;
      if (original) return original;
    }
    throw toCreatePurchaseError(error.message);
  }

  if (plan.provider === "vtu") {
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
      await notifyIfVtuOutOfFunds(err);
      await reportError({ source: "provider:vtu", error: err, context: { purchaseId: purchase.id, planId: plan.id } });
      await finalizePurchase({
        purchaseId: purchase.id,
        outcome: "failed",
        providerReference: null,
        failureReason: err instanceof Error ? err.message : "VTU request failed",
      });
    }
  } else {
    const provider = getProvider(plan.provider)!;
    let result: FulfillmentResult;
    try {
      result = await provider.fulfill({
        purchaseId: purchase.id,
        reference,
        phone: input.phoneNumber,
        plan: {
          id: plan.id,
          price: plan.price,
          sizeInMb: plan.size_in_mb,
          smeSizeCode: plan.sme_size_code,
          resellerCost: plan.reseller_cost,
        },
      });
    } catch (err) {
      // A provider that threw without saying whether it acted: never refund or retry on a guess.
      await reportError({ source: `provider:${plan.provider}`, error: err, context: { purchaseId: purchase.id, planId: plan.id } });
      result = { status: "unknown", reason: err instanceof Error ? err.message : "Provider error" };
    }
    await applyFulfillmentResult(purchase.id, result);
  }

  const result = await getTransaction(purchase.id);
  if (!result) throw new Error("Purchase not found after processing.");
  return result;
}

/** Manual reconciliation for a purchase stuck in 'processing'. VTU.ng's webhook only fires
 *  for refunds and manually-completed orders, not normal automated completions; SMEData's
 *  webhook has no signature so this requery path is the trustworthy source for it too; SIM
 *  orders are settled by the gateway, and this catches up any that were left half-settled. */
export async function requeryPurchaseAction(purchaseId: string): Promise<ActionResult<Transaction>> {
  return runAction("requeryPurchase", () => requeryPurchase(purchaseId));
}

async function requeryPurchase(purchaseId: string): Promise<Transaction> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UserError("Please log in again to continue.");

  const admin = createAdminClient();
  const { data: purchase } = await admin
    .from("purchases")
    .select("id, reference, user_id, status, data_plan_id, provider_reference")
    .eq("id", purchaseId)
    .maybeSingle();
  if (!purchase || purchase.user_id !== user.id) throw new UserError("We couldn't find that purchase.");

  if (purchase.status === "processing") {
    let provider: "vtu" | "smedata" | "sim" = "vtu";
    if (purchase.data_plan_id) {
      const { data: plan } = await admin
        .from("data_plans")
        .select("provider")
        .eq("id", purchase.data_plan_id)
        .maybeSingle();
      if (plan?.provider === "smedata" || plan?.provider === "sim") provider = plan.provider;
      // The MTN API route was removed; its orders (if any) live in the same SIM-pool tables.
      if (plan?.provider === "mtn_transfer") provider = "sim";
    }

    if (provider === "sim") {
      await reconcileSimPurchase(purchase.id);
    } else if (provider === "smedata") {
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
  if (!result) throw new UserError("We couldn't find that purchase.");
  return result;
}
