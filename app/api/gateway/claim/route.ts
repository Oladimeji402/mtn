import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGatewayAuthorized, parseLiveSims } from "@/lib/gateway-auth";
import { runSimSweep } from "@/lib/fulfillment/sim-pool";
import { reportError } from "@/lib/error-log";

// The myMTN app driver needs up to ~150s to get to the Share tap plus 60s for the result.
const LEASE_SECONDS = 300;

/**
 * Hands the gateway the oldest waiting job for a SIM it has live. The job is leased for five
 * minutes: if the gateway dies mid-transfer the lease lapses and the job becomes "unknown"
 * for an admin to check — it is deliberately never handed out again, because the gateway may
 * already have dialled and a second attempt could deliver the data twice.
 */
export async function POST(request: NextRequest) {
  if (!isGatewayAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const live = parseLiveSims(body?.liveSims);
  const gatewayId = typeof body?.gatewayId === "string" ? body.gatewayId.slice(0, 60) : null;
  if (!live || !gatewayId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    await runSimSweep();
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("fn_sim_claim", {
      p_gateway: gatewayId,
      p_live: live,
      p_lease_seconds: LEASE_SECONDS,
    });
    if (error) throw error;

    const job = data?.[0];
    if (!job) return NextResponse.json({ job: null });
    return NextResponse.json({
      job: {
        id: job.job_id,
        sourceMsisdn: job.source_msisdn,
        recipientMsisdn: job.recipient_msisdn,
        amountMb: job.amount_mb,
      },
    });
  } catch (err) {
    await reportError({ source: "gateway:claim", error: err, userId: null });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
