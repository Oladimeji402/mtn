/**
 * One interface for anything that can deliver MTN data for a purchase. A plan's
 * data_plans.provider picks the implementation, so the wallet/purchase flow never needs to
 * know whether the data comes from a reseller's stock or from the client's own SIMs.
 */
export interface FulfillmentPlan {
  id: string;
  price: number;
  sizeInMb: number;
  smeSizeCode: string | null;
  resellerCost: number | null;
}

export interface FulfillmentRequest {
  purchaseId: string;
  reference: string;
  phone: string;
  plan: FulfillmentPlan;
}

/**
 *  successful - delivered
 *  failed     - definitely NOT delivered; safe to refund the customer
 *  pending    - accepted, outcome arrives later (webhook, gateway report, requery)
 *  unknown    - may or may not have been delivered (timeout, crash). Must NOT be refunded or
 *               retried automatically — either could double-pay; an admin resolves it.
 */
export type FulfillmentResult =
  | { status: "successful"; providerReference: string | null }
  | { status: "failed"; reason: string; providerReference?: string | null }
  | { status: "pending"; providerReference: string | null }
  | { status: "unknown"; reason: string };

export interface DataFulfillmentProvider {
  readonly id: "smedata" | "sim" | "mtn_transfer";
  fulfill(request: FulfillmentRequest): Promise<FulfillmentResult>;
}
