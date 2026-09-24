import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileMtnPurchase } from "@/lib/fulfillment/mtn-transfer";
import { reportError } from "@/lib/error-log";

/**
 * MTN's completion callback. It cannot be authenticated (MTN sends no signature), so nothing in
 * the body is trusted: it is only used as a hint to look up OUR job by transaction id and then
 * ask MTN's status endpoint what really happened. Forged calls can at most trigger a status check.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const data = (body?.data ?? {}) as Record<string, unknown>;
    const candidates = [body?.transactionId, data.transactionId, data.localTransactionId].filter(
      (v): v is string => typeof v === "string" && /^[A-Za-z0-9+/=-]{5,64}$/.test(v),
    );
    if (candidates.length) {
      const admin = createAdminClient();
      const { data: job } = await admin
        .from("fulfillment_jobs")
        .select("purchase_id")
        .in("external_ref", candidates)
        .maybeSingle();
      if (job) await reconcileMtnPurchase(job.purchase_id);
    }
  } catch (error) {
    await reportError({ source: "webhook:mtn-transfer", error });
  }
  return NextResponse.json({ received: true });
}
