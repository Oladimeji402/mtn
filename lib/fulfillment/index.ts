import "server-only";
import { smeProvider } from "@/lib/fulfillment/sme";
import { simPoolProvider } from "@/lib/fulfillment/sim-pool";
import type { DataFulfillmentProvider } from "@/lib/fulfillment/types";

export { applyFulfillmentResult } from "@/lib/fulfillment/apply";

const providers: Record<string, DataFulfillmentProvider> = {
  smedata: smeProvider,
  sim: simPoolProvider,
};

/** VTU.ng is switched off and keeps its original inline path in lib/actions/purchase.ts. */
export function getProvider(id: string): DataFulfillmentProvider | null {
  return providers[id] ?? null;
}
