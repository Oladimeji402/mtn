"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/services/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { applyJobAction } from "@/lib/fulfillment/sim-pool";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

/**
 * Settles an order stuck in "processing" whose outcome the system couldn't determine (a
 * provider timeout, a gateway that stopped mid-transfer). The admin has checked the real
 * outcome — the SIM's data, or the provider's dashboard — and says which way it went.
 *  delivered     -> the order succeeds, no refund
 *  not_delivered -> the customer is refunded and a reserved SIM allowance is given back
 */
export async function resolveOrderAction(
  purchaseId: string,
  outcome: "delivered" | "not_delivered",
): Promise<ActionResult<true>> {
  return runAction("resolveOrder", async () => {
    const actor = await getCurrentAdmin();
    const admin = createAdminClient();

    const { data: purchase } = await admin
      .from("purchases")
      .select("id, status, provider_reference")
      .eq("id", purchaseId)
      .maybeSingle();
    if (!purchase || purchase.status !== "processing") {
      throw new UserError("This order is no longer waiting for review.");
    }

    const { data: job } = await admin
      .from("fulfillment_jobs")
      .select("id, status")
      .eq("purchase_id", purchaseId)
      .order("attempt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (job && (job.status === "queued" || job.status === "claimed")) {
      throw new UserError("The gateway is still working on this order. Give it a few minutes.");
    }

    if (job && job.status === "unknown") {
      const { data, error } = await admin.rpc("fn_sim_report", {
        p_job_id: job.id,
        p_outcome: outcome === "delivered" ? "success" : "failed",
        p_code: "ADMIN_RESOLVED",
        p_message: `Resolved by ${actor.username}`,
      });
      if (error) throw new Error(`Failed to resolve job: ${error.message}`);
      const row = data?.[0];
      if (row) await applyJobAction({ ...row, jobId: job.id });
    } else {
      await finalizePurchase({
        purchaseId,
        outcome: outcome === "delivered" ? "successful" : "failed",
        providerReference: purchase.provider_reference,
        failureReason: outcome === "delivered" ? null : "Resolved by admin as not delivered",
      });
    }

    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_type: "admin",
      action: "resolve_order",
      entity_type: "purchase",
      entity_id: purchaseId,
      metadata: { outcome },
    });
    return true as const;
  });
}
