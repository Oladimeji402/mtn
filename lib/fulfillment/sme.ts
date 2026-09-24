import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportError } from "@/lib/error-log";
import { notifyAdmins } from "@/lib/notify-admins";
import { isSmeInsufficientBalance, purchaseMtnData } from "@/lib/smedata";
import type { DataFulfillmentProvider, FulfillmentRequest, FulfillmentResult } from "@/lib/fulfillment/types";

/**
 * SMEData.ng: a reseller selling its own MTN stock, paid from Bunben's wallet on their site.
 * The client's SIMs are not involved. See lib/smedata.ts for the API's gaps (no idempotency
 * key, no signed webhook, no balance/pricing API), which is why any thrown error here is
 * "unknown" rather than "failed": the request may have been placed before the response was lost.
 */

async function notifyOutOfFunds() {
  await notifyAdmins({
    type: "sme_balance_low",
    title: "SMEData.ng wallet is out of funds",
    message: "A customer purchase just failed because Bunben's SMEData.ng wallet balance is too low. Fund it directly on smedata.ng.",
  });
}

/** SMEData has no pricing API, so a real purchase's charged amount is the only live signal. */
async function checkPriceDrift(planId: string, resellerCost: number | null, chargedAmount: number | null) {
  if (resellerCost === null || chargedAmount === null) return;
  if (Math.abs(chargedAmount - resellerCost) < 1) return;
  await notifyAdmins({
    type: "plan_price_drift",
    title: "SMEData.ng price changed",
    message: `${planId}: expected to be charged ₦${resellerCost.toLocaleString()} but SMEData charged ₦${chargedAmount.toLocaleString()}. Update this plan's price in Supabase (data_plans) to keep your margin.`,
  });
}

export const smeProvider: DataFulfillmentProvider = {
  id: "smedata",

  async fulfill(req: FulfillmentRequest): Promise<FulfillmentResult> {
    // Nothing has been sent yet for these two, so they are definite failures.
    if (!req.plan.smeSizeCode) return { status: "failed", reason: "Plan is not linked to SMEData" };
    if (!process.env.SMEDATA_API_TOKEN) return { status: "failed", reason: "SMEData is not configured" };

    let order;
    try {
      order = await purchaseMtnData({ phone: req.phone, sizeCode: req.plan.smeSizeCode });
    } catch (err) {
      await reportError({
        source: "provider:smedata",
        error: err,
        context: { purchaseId: req.purchaseId, planId: req.plan.id },
      });
      if (isSmeInsufficientBalance(err)) await notifyOutOfFunds();
      return { status: "unknown", reason: err instanceof Error ? err.message : "SMEData request failed" };
    }

    // Recorded immediately, not just at settlement: the webhook and "Check status" find the
    // purchase again through this when the first response is "processing".
    if (order.orderId !== null) {
      const admin = createAdminClient();
      await admin
        .from("purchases")
        .update({ provider_reference: String(order.orderId) })
        .eq("id", req.purchaseId);
    }

    const providerReference = order.orderId !== null ? String(order.orderId) : null;

    if (order.outcome === "failed") {
      if (/insufficient balance/i.test(order.message)) await notifyOutOfFunds();
      return { status: "failed", reason: `SMEData: ${order.message}`, providerReference };
    }
    if (order.outcome === "successful") {
      await checkPriceDrift(req.plan.id, req.plan.resellerCost, order.chargedAmount);
      return { status: "successful", providerReference };
    }
    return { status: "pending", providerReference };
  },
};

// Keeps the import used for the type-only export below tree-shake friendly.
export { isSmeInsufficientBalance };
