import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { notifyAdmins } from "@/lib/notify-admins";
import { reportError } from "@/lib/error-log";
import { applyFulfillmentResult } from "@/lib/fulfillment/apply";
import { fetchTransferStatus, makeTransactionId, mtnConfigured, sendTransfer } from "@/lib/mtn-transfer";
import type { DataFulfillmentProvider, FulfillmentRequest, FulfillmentResult } from "@/lib/fulfillment/types";

/**
 * Delivers data by moving it out of the client's own MTN subscriptions through MTN's official
 * Customer Data Transfer API — no phones, modems or gateway machine. It reuses the SIM pool
 * (data_sources / fulfillment_jobs) for capacity, daily-cap and rotation bookkeeping, with
 * transport = 'api'. All state changes go through the same fn_sim_* functions as the gateway.
 *
 * Safety rules, same as the gateway: a job is marked in-flight BEFORE the request goes out;
 * a request that errors out or times out is "unknown" (never refunded, never retried
 * automatically); an unrecognised answer is "pending" until MTN's status call says otherwise.
 */

const API_LEASE_SECONDS = 600;
const ACTOR = "mtn-api";
const MAX_SOURCES_TRIED = 5;

async function alertNoCapacity() {
  await notifyAdmins({
    type: "sim_pool_alert",
    title: "No SIM can take orders",
    message:
      "A customer order was refunded because no MTN line has enough daily allowance and data left. Check Admin > SIMs (top up bundles, or the lines are resting).",
  });
}

async function alertHold() {
  await notifyAdmins({
    type: "order_needs_review",
    title: "An order needs your review",
    message:
      "An MTN data transfer's outcome is unclear. The customer is waiting: check the sending line's data and the recipient, then resolve the order in Admin > Transactions.",
  });
}

async function report(jobId: string, outcome: string, code: string, message: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("fn_sim_report", {
    p_job_id: jobId,
    p_outcome: outcome,
    p_code: code,
    p_message: message.slice(0, 300),
  });
  if (error) throw new Error(`fn_sim_report failed: ${error.message}`);
  return data?.[0] ?? null;
}

/** Allocates a line and sends the transfer, moving on to the next line if one is capped. */
export async function runMtnTransfer(params: {
  purchaseId: string;
  phone: string;
  sizeMb: number;
  exclude?: string[];
}): Promise<FulfillmentResult> {
  const admin = createAdminClient();
  const exclude = [...(params.exclude ?? [])];

  for (let tried = 0; tried < MAX_SOURCES_TRIED; tried++) {
    const { data: job, error } = await admin.rpc("fn_sim_allocate", {
      p_purchase_id: params.purchaseId,
      p_amount_mb: params.sizeMb,
      p_recipient: params.phone,
      p_exclude: exclude,
      p_transport: "api",
    });
    if (error) {
      if (error.message.includes("NO_CAPACITY")) {
        await alertNoCapacity();
        return { status: "failed", reason: "No SIM capacity available" };
      }
      // One atomic function: an error means nothing was reserved or sent.
      await reportError({ source: "provider:mtn_transfer", error, context: { purchaseId: params.purchaseId } });
      return { status: "failed", reason: "Allocation error" };
    }

    const { data: source } = await admin.from("data_sources").select("msisdn").eq("id", job.source_id).single();
    if (!source) {
      await report(job.id, "failed", "NO_SOURCE", "Source line missing");
      return { status: "failed", reason: "Allocation error" };
    }

    const transactionId = makeTransactionId(job.id);
    const { data: began, error: beginError } = await admin.rpc("fn_sim_begin", {
      p_job_id: job.id,
      p_actor: ACTOR,
      p_external_ref: transactionId,
      p_lease_seconds: API_LEASE_SECONDS,
    });
    if (beginError) {
      // Marked in-flight failed: nothing was sent. The stale queued job is released by the sweep.
      await reportError({ source: "provider:mtn_transfer", error: beginError, context: { jobId: job.id } });
      return { status: "pending", providerReference: job.id };
    }
    if (!began) return { status: "pending", providerReference: transactionId }; // someone else owns it

    exclude.push(job.source_id);

    let outcome;
    try {
      outcome = await sendTransfer({
        senderMsisdn: source.msisdn,
        receiverMsisdn: params.phone,
        sizeMb: params.sizeMb,
        transactionId,
      });
    } catch (err) {
      // Timeout / network error / our own sign-in failing: MTN may or may not have acted.
      await reportError({ source: "provider:mtn_transfer", error: err, context: { jobId: job.id } });
      await report(job.id, "unknown", "REQUEST_ERROR", err instanceof Error ? err.message : "request error");
      await alertHold();
      return { status: "unknown", reason: "MTN request did not complete" };
    }

    const { result, raw } = outcome;
    switch (result.kind) {
      case "success":
        await report(job.id, "success", "OK", result.message);
        return { status: "successful", providerReference: transactionId };

      case "pending":
        // Stays claimed with a long lease; the webhook / requery settles it via the status call.
        return { status: "pending", providerReference: transactionId };

      case "limit":
      case "bundle":
        await report(job.id, result.kind === "limit" ? "limit_reached" : "insufficient_bundle", result.kind.toUpperCase(), result.message);
        continue; // next line

      case "rejected":
        await report(job.id, "failed", "REJECTED", result.message);
        await notifyAdmins({
          type: "sim_pool_alert",
          title: "MTN rejected a data transfer",
          message: `MTN said: ${result.message.slice(0, 200)}. ${result.fatal ? "Check the MTN API keys and that the API is approved for this app." : "Check that this line is allowed to send data."}`,
        });
        await reportError({ source: "provider:mtn_transfer", error: new Error(`rejected: ${result.message}`), context: { jobId: job.id, raw } });
        return { status: "failed", reason: "MTN rejected the transfer" };

      case "unknown":
        await report(job.id, "unknown", "MTN_UNCLEAR", result.message);
        await alertHold();
        return { status: "unknown", reason: "MTN gave an unclear answer" };
    }
  }

  await alertNoCapacity();
  return { status: "failed", reason: "No SIM capacity available" };
}

export const mtnTransferProvider: DataFulfillmentProvider = {
  id: "mtn_transfer",

  async fulfill(req: FulfillmentRequest): Promise<FulfillmentResult> {
    if (!mtnConfigured()) {
      // Nothing has been sent: definite failure, safe to refund.
      await reportError({ source: "provider:mtn_transfer", error: new Error("MTN API credentials are not configured") });
      return { status: "failed", reason: "MTN transfer is not configured" };
    }
    return runMtnTransfer({ purchaseId: req.purchaseId, phone: req.phone, sizeMb: req.plan.sizeInMb });
  },
};

/**
 * Asks MTN what happened to an in-flight or parked transfer and settles it. Read-only toward
 * MTN and idempotent here, so the webhook, the customer's "check status" and the sweep can all
 * call it. Success settles automatically; a failure only settles when MTN itself answered
 * successfully with a failed state (a 404 or 5xx is "we don't know", not "it failed").
 */
export async function reconcileMtnPurchase(purchaseId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("fulfillment_jobs")
    .select("id, status, external_ref, source_id, recipient_msisdn, amount_mb")
    .eq("purchase_id", purchaseId)
    .order("attempt", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job || !job.external_ref) return;

  if (job.status === "succeeded") {
    await finalizePurchase({ purchaseId, outcome: "successful", providerReference: job.external_ref, failureReason: null });
    return;
  }
  if (job.status !== "claimed" && job.status !== "unknown") return;

  let status;
  try {
    status = await fetchTransferStatus(job.external_ref);
  } catch (err) {
    await reportError({ source: "provider:mtn_transfer", error: err, context: { purchaseId, jobId: job.id } });
    return;
  }
  const { result, httpStatus } = status;

  if (result.kind === "success") {
    await report(job.id, "success", "OK", result.message);
    await finalizePurchase({ purchaseId, outcome: "successful", providerReference: job.external_ref, failureReason: null });
    return;
  }
  if (httpStatus >= 300) return;

  if (result.kind === "rejected") {
    await report(job.id, "failed", "REJECTED", result.message);
    await finalizePurchase({ purchaseId, outcome: "failed", providerReference: job.external_ref, failureReason: "MTN rejected the transfer" });
    return;
  }
  if (result.kind === "limit" || result.kind === "bundle") {
    await report(job.id, result.kind === "limit" ? "limit_reached" : "insufficient_bundle", result.kind.toUpperCase(), result.message);
    const { data: tried } = await admin.from("fulfillment_jobs").select("source_id").eq("purchase_id", purchaseId);
    const next = await runMtnTransfer({
      purchaseId,
      phone: job.recipient_msisdn,
      sizeMb: job.amount_mb,
      exclude: (tried ?? []).map((t) => t.source_id),
    });
    await applyFulfillmentResult(purchaseId, next);
  }
  // pending / unknown: leave as is.
}
