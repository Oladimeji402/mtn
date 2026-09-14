import { mockUsage } from "@/lib/mock/usage";
import { simulateDelay } from "@/lib/services/delay";
import type { Usage } from "@/types";

export async function getUsage(): Promise<Usage> {
  await simulateDelay(300);
  return mockUsage;
}
