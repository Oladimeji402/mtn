import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { notifyAdmins } from "@/lib/notify-admins";
import { reportError } from "@/lib/error-log";
import type { DataFulfillmentProvider, FulfillmentRequest, FulfillmentResult } from "@/lib/fulfillment/types";

/**
 * The client's own MTN SIMs as the data source. A purchase reserves capacity on one SIM
 * (fn_sim_allocate), a gateway next to the SIMs picks the job up and dials MTN's gifting
 * USSD, and reports back. Everything here is the app's half of that handshake; the SQL
 * functions in migration 0028 own the state and the concurrency guarantees.
 */

const NO_CAPACITY_REASON = "No SIM capacity available";
const QUEUE_TIMEOUT_SECONDS = 900;

async function alertNoCapacity() {
  await notifyAdmins({
    type: "sim_pool_alert",
    title: "No SIM can take orders",
    message:
      "A customer order was refunded because no SIM is online with enough daily allowance and data left. Check Admin > SIMs (is the gateway running, are bundles topped up?).",
  });
}

async function alertHold() {
  await notifyAdmins({
    type: "order_needs_review",
    title: "An order needs your review",
    message:
      "A SIM transfer's outcome is unclear (the gateway stopped or gave an unrecognised reply). The customer is waiting: check the SIM's data, then resolve the order in Admin > SIMs.",
  });
}

export const simPoolProvider: DataFulfillmentProvider = {
  id: "sim",

  async fulfill(req: FulfillmentRequest): Promise<FulfillmentResult> {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("fn_sim_allocate", {
      p_purchase_id: req.purchaseId,
      p_amount_mb: req.plan.sizeInMb,
      p_recipient: req.phone,
    });

    if (error) {
      if (error.message.includes("NO_CAPACITY")) {
        await alertNoCapacity();
        return { status: "failed", reason: NO_CAPACITY_REASON };
      }
      // Allocation is one atomic database function: an error means no job exists and no SIM
      // was reserved, so nothing can have been sent — a definite failure, safe to refund.
      await reportError({ source: "provider:sim", error, context: { purchaseId: req.purchaseId, planId: req.plan.id } });
      return { status: "failed", reason: "SIM allocation error" };
    }

    // The gateway settles it; until then the purchase stays 'processing'.
    return { status: "pending", providerReference: data.id };
  },
};

/** Why an order moved to another SIM, in words an admin can act on. */
async function reallocationNotice(jobId: string) {
  const admin = createAdminClient();
  const { data: job } = await admin.from("fulfillment_jobs").select("result_code, result_message").eq("id", jobId).maybeSingle();
  const base = { type: "sim_pool_alert" as const };
  switch (job?.result_code) {
    case "NOT_SENT":
      return {
        ...base,
        title: "A SIM couldn't send an order",
        message: `Nothing was sent, so the order moved to the next SIM. Gateway said: ${job.result_message ?? "no details"}. If a SIM is logged out of myMTN, log it back in on the gateway phone.`,
      };
    case "QUEUE_TIMEOUT":
      return {
        ...base,
        title: "The gateway fell behind",
        message: "An order waited too long without being picked up and moved to another SIM. Check the gateway is running (Admin > SIMs shows which SIMs are online).",
      };
    default:
      return {
        ...base,
        title: "A SIM is out of allowance",
        message:
          "A SIM reached its daily limit or ran out of data mid-order and the order moved to the next SIM. Check Admin > SIMs to top up or rest that SIM.",
      };
  }
}

export interface JobAction {
  purchase_id: string;
  source_id: string;
  action: string;
  recipient_msisdn: string;
  amount_mb: number;
  excluded: string[];
  jobId: string;
}

/** Turns a database job outcome into the customer-facing purchase outcome. Safe to repeat. */
export async function applyJobAction(a: JobAction): Promise<void> {
  switch (a.action) {
    case "finalize_success":
      await finalizePurchase({
        purchaseId: a.purchase_id,
        outcome: "successful",
        providerReference: a.jobId,
        failureReason: null,
      });
      return;

    case "finalize_failed":
      await finalizePurchase({
        purchaseId: a.purchase_id,
        outcome: "failed",
        providerReference: a.jobId,
        failureReason: "SIM transfer failed",
      });
      return;

    case "reallocate": {
      // This SIM hit its daily cap or ran out of data — the moment the client described:
      // move on to the next SIM. Excluded = every SIM already tried for this purchase.
      const admin = createAdminClient();
      const { error } = await admin.rpc("fn_sim_allocate", {
        p_purchase_id: a.purchase_id,
        p_amount_mb: a.amount_mb,
        p_recipient: a.recipient_msisdn,
        p_exclude: a.excluded,
      });
      await notifyAdmins(await reallocationNotice(a.jobId));
      if (error) {
        if (error.message.includes("NO_CAPACITY")) {
          await alertNoCapacity();
          await finalizePurchase({
            purchaseId: a.purchase_id,
            outcome: "failed",
            providerReference: a.jobId,
            failureReason: NO_CAPACITY_REASON,
          });
          return;
        }
        throw new Error(`SIM re-allocation failed: ${error.message}`);
      }
      return;
    }

    case "hold":
      await alertHold();
      return;

    default:
      return; // 'noop': already settled
  }
}

/**
 * Housekeeping plus catch-up, called opportunistically (the Hobby-plan cron only runs daily):
 *  - a claimed job whose gateway went silent becomes 'unknown' and pages an admin
 *  - a job nobody picked up within 15 minutes is released and moved to another SIM (or refunded)
 */
export async function runSimSweep(): Promise<void> {
  const admin = createAdminClient();
  // One gateway sends one order at a time (about a minute each with the myMTN app driver), so a
  // burst of orders queues; 15 minutes lets a dozen wait their turn before one is moved.
  const { data: swept, error } = await admin.rpc("fn_sim_sweep", { p_queue_timeout_seconds: QUEUE_TIMEOUT_SECONDS });
  if (error) throw new Error(`SIM sweep failed: ${error.message}`);

  for (const item of swept ?? []) {
    if (item.kind === "unknown") {
      await alertHold();
      continue;
    }
    const { data: job } = await admin
      .from("fulfillment_jobs")
      .select("purchase_id, source_id, recipient_msisdn, amount_mb")
      .eq("id", item.job_id)
      .single();
    if (!job) continue;
    const { data: tried } = await admin.from("fulfillment_jobs").select("source_id").eq("purchase_id", job.purchase_id);
    await applyJobAction({
      purchase_id: job.purchase_id,
      source_id: job.source_id,
      action: "reallocate",
      recipient_msisdn: job.recipient_msisdn,
      amount_mb: job.amount_mb,
      excluded: (tried ?? []).map((t) => t.source_id),
      jobId: item.job_id,
    });
  }
}

/**
 * Catch-up for a purchase whose job already has a final result but whose purchase never got
 * settled (e.g. the app crashed between the gateway's report and finalizing). Idempotent.
 */
export async function reconcileSimPurchase(purchaseId: string): Promise<void> {
  await runSimSweep();

  const admin = createAdminClient();
  const { data: job } = await admin
    .from("fulfillment_jobs")
    .select("id, status, result_code, source_id, recipient_msisdn, amount_mb")
    .eq("purchase_id", purchaseId)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) return;

  const base = { purchase_id: purchaseId, source_id: job.source_id, recipient_msisdn: job.recipient_msisdn, amount_mb: job.amount_mb, excluded: [] as string[], jobId: job.id };

  if (job.status === "succeeded") {
    await applyJobAction({ ...base, action: "finalize_success" });
  } else if (job.status === "failed") {
    const retryable = ["LIMIT_REACHED", "INSUFFICIENT_BUNDLE", "NOT_SENT"].includes(job.result_code ?? "");
    const { data: tried } = await admin.from("fulfillment_jobs").select("source_id").eq("purchase_id", purchaseId);
    await applyJobAction({
      ...base,
      action: retryable ? "reallocate" : "finalize_failed",
      excluded: (tried ?? []).map((t) => t.source_id),
    });
  }
}
