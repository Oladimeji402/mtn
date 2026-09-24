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
  const poolSizes = [...new Set(rows.filter((r) => r.provider === "sim").map((r) => r.size_in_mb))];
  const capacity = new Map<number, boolean>();
  if (poolSizes.length) {
    const admin = createAdminClient();
    await Promise.all(
      poolSizes.map(async (size) => {
        const { data: ok } = await admin.rpc("fn_sim_capacity", { p_amount_mb: size });
        capacity.set(size, ok === true);
      }),
    );
  }

  // Retired MTN-API plans are never offered, even if one is still switched on.
  return rows
    .filter((r) => r.provider !== "mtn_transfer")
    .map((r) => toDataPlan(r, r.provider === "sim" ? (capacity.get(r.size_in_mb) ?? false) : true));
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
