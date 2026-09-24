import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGatewayAuthorized, parseLiveSims, parseSimAlerts } from "@/lib/gateway-auth";
import { notifyAdmins } from "@/lib/notify-admins";
import { runSimSweep } from "@/lib/fulfillment/sim-pool";
import { reportError } from "@/lib/error-log";

/**
 * The gateway says which SIMs it currently has live. A SIM only takes orders while it is
 * reporting in, so a gateway that is switched off or loses power stops new orders cleanly
 * (customers are refused up front) instead of jobs piling up with nobody to run them.
 */
export async function POST(request: NextRequest) {
  if (!isGatewayAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const live = parseLiveSims(body?.liveSims);
  const gatewayId = typeof body?.gatewayId === "string" ? body.gatewayId.slice(0, 60) : null;
  if (!live || !gatewayId) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  try {
    // A SIM the gateway found logged out of myMTN (or back in). One unread alert per type is
    // kept by notifyAdmins, so a flapping SIM can't flood the admins.
    for (const alert of parseSimAlerts(body?.alerts)) {
      await notifyAdmins({ type: "sim_pool_alert", title: `SIM ${alert.msisdn} needs attention`, message: alert.reason });
    }

    const admin = createAdminClient();
    let known: string[] = [];
    if (live.length) {
      const { data } = await admin
        .from("data_sources")
        .update({ last_seen_at: new Date().toISOString(), gateway_id: gatewayId })
        .in("msisdn", live)
        .eq("is_active", true)
        .select("msisdn");
      known = (data ?? []).map((d) => d.msisdn);
    }
    await runSimSweep();
    return NextResponse.json({ ok: true, known });
  } catch (err) {
    await reportError({ source: "gateway:heartbeat", error: err, userId: null });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
