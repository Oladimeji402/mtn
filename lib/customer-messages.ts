/**
 * What a customer is told when a purchase fails, whatever the real cause. The real reason
 * (e.g. "SMEData: Insufficient Balance" when Bunben's own supplier wallet is empty) is stored
 * in purchases.failure_reason for admins — it's an operational problem on our side, not
 * something the customer did, and naming the supplier or our balance to them helps nobody.
 */
export const PURCHASE_FAILED_MESSAGE =
  "We couldn't complete this purchase right now. Your wallet has been refunded. Please try again in a little while.";

export const FUNDING_FAILED_MESSAGE =
  "We couldn't confirm this payment. If you were charged, please contact support and we'll sort it out.";
