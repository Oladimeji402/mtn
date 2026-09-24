"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/services/admin";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const OPEN = ["requested", "working", "needs_code", "code_sent"] as const;

async function audit(actorId: string, action: string, loginId: string, sourceId: string) {
  await createAdminClient().from("audit_log").insert({
    actor_id: actorId,
    actor_type: "admin",
    action,
    entity_type: "sim_login",
    entity_id: loginId,
    metadata: { sourceId },
  });
}

/** Asks the gateway to log this SIM in to myMTN. MTN then texts a code to the SIM. */
export async function startSimLoginAction(sourceId: string): Promise<ActionResult<{ id: string }>> {
  return runAction("startSimLogin", async () => {
    const actor = await getCurrentAdmin();
    if (!z.string().uuid().safeParse(sourceId).success) throw new UserError("SIM not found.");
    const admin = createAdminClient();

    const { data: sim } = await admin.from("data_sources").select("id, msisdn").eq("id", sourceId).maybeSingle();
    if (!sim) throw new UserError("SIM not found.");

    await admin.rpc("fn_sim_login_expire");
    const { data, error } = await admin
      .from("sim_logins")
      .insert({ source_id: sim.id, msisdn: sim.msisdn, requested_by: actor.id })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") throw new UserError("A login for this SIM is already in progress.");
      throw new Error(`Failed to start SIM login: ${error.message}`);
    }
    await audit(actor.id, "start_sim_login", data.id, sim.id);
    return { id: data.id };
  });
}

const codeSchema = z.object({
  loginId: z.string().uuid(),
  code: z.string().trim().regex(/^\d{4,8}$/, "Enter the code from the text message (numbers only)."),
});

/** Hands the code MTN texted to the SIM over to the gateway. */
export async function submitSimLoginCodeAction(loginId: string, code: string): Promise<ActionResult<true>> {
  return runAction("submitSimLoginCode", async () => {
    const actor = await getCurrentAdmin();
    const parsed = codeSchema.safeParse({ loginId, code: code.replace(/\s/g, "") });
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the code.");
    const admin = createAdminClient();

    await admin.rpc("fn_sim_login_expire");
    const { data } = await admin
      .from("sim_logins")
      .update({ status: "code_sent", code: parsed.data.code, message: null, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.loginId)
      .eq("status", "needs_code")
      .select("id, source_id")
      .maybeSingle();
    if (!data) throw new UserError("This login is no longer waiting for a code. Start it again if needed.");

    // The code itself is never written to the audit log.
    await audit(actor.id, "submit_sim_login_code", data.id, data.source_id);
    return true as const;
  });
}

export async function cancelSimLoginAction(loginId: string): Promise<ActionResult<true>> {
  return runAction("cancelSimLogin", async () => {
    const actor = await getCurrentAdmin();
    if (!z.string().uuid().safeParse(loginId).success) throw new UserError("Login not found.");
    const admin = createAdminClient();

    const { data } = await admin
      .from("sim_logins")
      .update({ status: "cancelled", code: null, message: "Cancelled from the admin page.", updated_at: new Date().toISOString() })
      .eq("id", loginId)
      .in("status", [...OPEN])
      .select("id, source_id")
      .maybeSingle();
    if (data) await audit(actor.id, "cancel_sim_login", data.id, data.source_id);
    return true as const;
  });
}
