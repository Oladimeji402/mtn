import { createClient } from "@/lib/supabase/server";
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
}): DataPlan {
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
  };
}

export async function getDataPlans(): Promise<DataPlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_plans")
    .select("id, network, size, size_in_mb, validity_days, price, category, popular")
    .eq("active", true)
    .order("size_in_mb", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toDataPlan);
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
