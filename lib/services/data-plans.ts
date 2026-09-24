import { mtnConfigured } from "@/lib/mtn-transfer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DataPlan } from "@/types";

function toDataPlan(row: {
  id: string;
  network: string;
  size: string;
  size_in_mb: number;
  validity_days: number;
  price: number;
  category: "daily" | "weekly" | "monthly";
  popular: boolean;
}, available = true): DataPlan {
  return {
    id: row.id,
    network: "MTN",
    size: row.size,
    sizeInMB: row.size_in_mb,
    validityDays: row.validity_days,
    validityLabel: row.validity_days === 1 ? "1 day" : `${row.validity_days} days`,
    price: row.price,
    category: row.category,
    popular: row.popular,
    available,
  };
}

export async function getDataPlans(): Promise<DataPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_plans")
    .select("id, network, size, size_in_mb, validity_days, price, category, popular, provider")
    .eq("active", true)
    .order("size_in_mb", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  // SIM-pool plans depend on live capacity (a SIM online with daily allowance and data left).
  // Checked with the service role because the pool functions are not exposed to customers.
  // SIM / MTN-transfer plans depend on live capacity (a line with daily allowance and data left;
  // for the gateway, also online). Checked with the service role: the functions aren't exposed.
  const poolKey = (r: { provider: string; size_in_mb: number }) => `${r.provider}:${r.size_in_mb}`;
  const poolPlans = rows.filter((r) => r.provider === "sim" || r.provider === "mtn_transfer");
  const capacity = new Map<string, boolean>();
  if (poolPlans.length) {
    const admin = createAdminClient();
    const keys = new Map(poolPlans.map((r) => [poolKey(r), r]));
    await Promise.all(
      [...keys.entries()].map(async ([key, r]) => {
        if (r.provider === "mtn_transfer" && !mtnConfigured()) return void capacity.set(key, false);
        const { data: ok } = await admin.rpc("fn_sim_capacity", {
          p_amount_mb: r.size_in_mb,
          p_transport: r.provider === "mtn_transfer" ? "api" : "gateway",
        });
        capacity.set(key, ok === true);
      }),
    );
  }

  return rows.map((r) => toDataPlan(r, r.provider === "sim" || r.provider === "mtn_transfer" ? (capacity.get(poolKey(r)) ?? false) : true));
}

export async function getDataPlan(id: string): Promise<DataPlan | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("data_plans")
    .select("id, network, size, size_in_mb, validity_days, price, category, popular")
    .eq("id", id)
    .maybeSingle();

  return data ? toDataPlan(data) : null;
}
