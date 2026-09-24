import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isGatewayAuthorized } from "@/lib/gateway-auth";
import { reportError } from "@/lib/error-log";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GATEWAY_STATUSES = new Set(["working", "needs_code", "succeeded", "failed"]);

/**
 * The gateway's half of logging a SIM in to myMTN from the admin page (migration 0033):
 *   next    -> the oldest waiting login, now marked "working" ({ login: null } if none)
 *   update  -> the gateway's progress: working | needs_code | succeeded | failed (+ message)
 *   code    -> the code the admin typed, handed over once ({ code: null, status } until then)
 * `update` and `code` return the login's current status, so a gateway whose login was cancelled
 * or expired by the admin page stops.
 */
export async function POST(request: NextRequest) {
  if (!isGatewayAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const gatewayId = typeof body?.gatewayId === "string" ? body.gatewayId.slice(0, 60) : null;
  const id = typeof body?.id === "string" && UUID.test(body.id) ? body.id : null;
  if (!gatewayId || !["next", "update", "code"].includes(action) || (action !== "next" && !id)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    if (action === "next") {
      const { data, error } = await admin.rpc("fn_sim_login_claim", { p_gateway: gatewayId });
      if (error) throw error;
      const row = data?.[0];
      return NextResponse.json({ login: row ? { id: row.login_id, msisdn: row.msisdn } : null });
    }

    if (action === "code") {
      const { data, error } = await admin.rpc("fn_sim_login_take_code", { p_login_id: id! });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return NextResponse.json({ error: "Login not found" }, { status: 404 });
      return NextResponse.json({ status: row.status, code: row.code });
    }

    // update
    const status = body?.status;
    if (!GATEWAY_STATUSES.has(status)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const message = typeof body?.message === "string" ? body.message.slice(0, 300) : null;
    await admin.rpc("fn_sim_login_expire");
    // Only a login the gateway is actually working on can move; a cancelled or expired one stays put.
    const { data: updated } = await admin
      .from("sim_logins")
      .update({ status, message, code: null, updated_at: new Date().toISOString() })
      .eq("id", id!)
      .in("status", ["working", "needs_code"])
      .select("status")
      .maybeSingle();
    if (updated) return NextResponse.json({ status: updated.status });

    const { data: current } = await admin.from("sim_logins").select("status").eq("id", id!).maybeSingle();
    if (!current) return NextResponse.json({ error: "Login not found" }, { status: 404 });
    return NextResponse.json({ status: current.status });
  } catch (err) {
    await reportError({ source: "gateway:login", error: err, userId: null, context: { action } });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
