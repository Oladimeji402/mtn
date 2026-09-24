"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/services/admin";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Give the SIM a name").max(40),
  msisdn: z.string().trim().regex(/^0\d{10}$/, "Enter the SIM's 11-digit number"),
  // undefined = leave as it is; null = not known (the gateway will read it)
  bundleRemainingMb: z.number().int().min(0).max(1_000_000).nullable().optional(),
  dailyLimitMb: z.number().int().min(100).max(1_000_000),
  isActive: z.boolean(),
  notes: z.string().trim().max(200).optional(),
});

export type SaveSimInput = z.infer<typeof saveSchema>;

/** Adds or edits a SIM. Only the phone number is stored — never a SIM PIN or any secret. */
export async function saveSimAction(input: SaveSimInput): Promise<ActionResult<{ id: string }>> {
  return runAction("saveSim", async () => {
    const actor = await getCurrentAdmin();
    const parsed = saveSchema.safeParse(input);
    if (!parsed.success) throw new UserError(parsed.error.issues[0]?.message ?? "Check the SIM details.");
    const v = parsed.data;

    const admin = createAdminClient();
    const row = {
      label: v.label,
      msisdn: v.msisdn,
      // A typed figure replaces the gateway's reading until the next order reads it again.
      ...(v.bundleRemainingMb !== undefined ? { bundle_remaining_mb: v.bundleRemainingMb, bundle_checked_at: null } : {}),
      daily_limit_mb: v.dailyLimitMb,
      is_active: v.isActive,
      notes: v.notes || null,
      updated_at: new Date().toISOString(),
    };

    const query = v.id
      ? admin.from("data_sources").update(row).eq("id", v.id).select("id").single()
      : admin.from("data_sources").insert(row).select("id").single();
    const { data, error } = await query;

    if (error) {
      if (error.code === "23505") throw new UserError("That number is already in the pool.");
      throw new Error(`Failed to save SIM: ${error.message}`);
    }

    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_type: "admin",
      action: v.id ? "update_sim" : "add_sim",
      entity_type: "data_source",
      entity_id: data.id,
      metadata: { label: v.label, isActive: v.isActive },
    });
    return { id: data.id };
  });
}

export async function deleteSimAction(id: string): Promise<ActionResult<true>> {
  return runAction("deleteSim", async () => {
    const actor = await getCurrentAdmin();
    const admin = createAdminClient();

    const { count } = await admin.from("fulfillment_jobs").select("id", { count: "exact", head: true }).eq("source_id", id);
    if ((count ?? 0) > 0) throw new UserError("This SIM has order history, so it can't be deleted. Turn it off instead.");

    const { error } = await admin.from("data_sources").delete().eq("id", id);
    if (error) throw new Error(`Failed to delete SIM: ${error.message}`);

    await admin.from("audit_log").insert({
      actor_id: actor.id,
      actor_type: "admin",
      action: "delete_sim",
      entity_type: "data_source",
      entity_id: id,
    });
    return true as const;
  });
}
