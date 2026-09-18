import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The single settlement path for a purchase's outcome, shared by both providers (VTU.ng,
 * SMEData.ng) — the purchase Server Action's immediate outcome from a provider's synchronous
 * response, a provider's webhook (later outcome — refunds, a manually-completed order, or
 * SMEData's unsigned webhook once verified via its own requery), and the manual "Check
 * status" requery action. The status check here is a fast-path only (skips an RPC round trip
 * in the common non-racing case) — fn_finalize_purchase itself re-checks status atomically
 * after acquiring its row lock (migration 0014), so this stays correct even if two of
 * these callers land at genuinely the same moment.
 */
export async function finalizePurchase(params: {
  purchaseId: string;
  outcome: "successful" | "failed";
  providerReference: string | null;
  failureReason: string | null;
}) {
  const admin = createAdminClient();

  const { data: purchase } = await admin
    .from("purchases")
    .select("id, status, user_id, type, amount, phone_number")
    .eq("id", params.purchaseId)
    .maybeSingle();

  if (!purchase || purchase.status !== "processing") return purchase;

  const { data: finalized, error } = await admin.rpc("fn_finalize_purchase", {
    p_purchase_id: params.purchaseId,
    p_status: params.outcome,
    p_provider_reference: params.providerReference,
    p_failure_reason: params.failureReason,
  });
  if (error) throw new Error(`Failed to finalize purchase: ${error.message}`);

  const isSuccess = params.outcome === "successful";
  const productLabel = purchase.type === "airtime" ? "Airtime" : "Data";

  await admin.from("notifications").insert({
    user_id: purchase.user_id,
    type: isSuccess
      ? purchase.type === "airtime"
        ? "airtime_success"
        : "data_success"
      : purchase.type === "airtime"
        ? "airtime_failed"
        : "data_failed",
    title: isSuccess ? `${productLabel} purchase successful` : `${productLabel} purchase failed`,
    message: isSuccess
      ? `₦${purchase.amount.toLocaleString()} ${purchase.type} sent to ${purchase.phone_number}.`
      : `₦${purchase.amount.toLocaleString()} ${purchase.type} purchase failed and was refunded.`,
  });

  return finalized;
}
