import "server-only";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { notifyAdmins } from "@/lib/notify-admins";
import type { FulfillmentResult } from "@/lib/fulfillment/types";

/** Turns a provider's answer into the purchase's state. The single place that decides. */
export async function applyFulfillmentResult(purchaseId: string, result: FulfillmentResult): Promise<void> {
  switch (result.status) {
    case "successful":
      await finalizePurchase({ purchaseId, outcome: "successful", providerReference: result.providerReference, failureReason: null });
      return;
    case "failed":
      await finalizePurchase({ purchaseId, outcome: "failed", providerReference: result.providerReference ?? null, failureReason: result.reason });
      return;
    case "pending":
      return;
    case "unknown":
      // Neither refund nor retry: either could pay twice. Leave it processing for an admin.
      await notifyAdmins({
        type: "order_needs_review",
        title: "An order needs your review",
        message: `A purchase's outcome is unclear (${result.reason}). Find the processing order in Admin > Transactions, check with the provider, then resolve it.`,
      });
      return;
  }
}
