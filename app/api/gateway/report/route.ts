import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGatewayAuthorized } from "@/lib/gateway-auth";
import { applyJobAction } from "@/lib/fulfillment/sim-pool";
import { reportError } from "@/lib/error-log";

const OUTCOMES = new Set(["success", "failed", "limit_reached", "insufficient_bundle", "not_sent", "unknown"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The gateway's result for a job. Safe to repeat: the database ignores a report for a job that
 * is already settled, so a gateway that retries after a network error can't double-settle.
 * Anything the gateway doesn't recognise it should send as "unknown" — never guess success.
 * "not_sent" means the gateway certainly moved no data, so the order goes to another SIM.
 */
export async function POST(request: NextRequest) {
  if (!isGatewayAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const jobId = body?.jobId;
  const outcome = body?.outcome;
  const message = typeof body?.message === "string" ? body.message.slice(0, 500) : null;
  if (typeof jobId !== "string" || !UUID.test(jobId) || typeof outcome !== "string" || !OUTCOMES.has(outcome)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("fn_sim_report", {
      p_job_id: jobId,
      p_outcome: outcome,
      p_code: outcome.toUpperCase(),
      p_message: message,
    });
    if (error) {
      if (error.message.includes("JOB_NOT_FOUND")) return NextResponse.json({ error: "Job not found" }, { status: 404 });
      throw error;
    }

    const row = data?.[0];
    if (!row) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    await applyJobAction({ ...row, jobId });
    return NextResponse.json({ ok: true, action: row.action });
  } catch (err) {
    await reportError({ source: "gateway:report", error: err, userId: null, context: { jobId, outcome } });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
