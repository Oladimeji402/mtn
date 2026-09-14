import { mockDataPlans } from "@/lib/mock/data-plans";
import { simulateDelay } from "@/lib/services/delay";
import type { DataPlan } from "@/types";

/**
 * Mock data plan catalogue. These prices and validity windows are illustrative only —
 * the real values will come from the VTU provider's live plan list.
 */
export async function getDataPlans(): Promise<DataPlan[]> {
  await simulateDelay(400);
  return mockDataPlans;
}

export async function getDataPlan(id: string): Promise<DataPlan | null> {
  await simulateDelay(200);
  return mockDataPlans.find((p) => p.id === id) ?? null;
}
