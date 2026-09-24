import "server-only";

const SME_API = "https://smedata.ng/wp-json/api/v1";

function token(): string {
  const t = process.env.SMEDATA_API_TOKEN;
  if (!t) throw new Error("SMEDATA_API_TOKEN is not set.");
  return t;
}

/** Carries SMEData's own `message` so callers can pattern-match specific failures (e.g.
 *  "Insufficient Balance") — unlike VTU, SMEData doesn't return a distinct machine-readable
 *  error code, only this free-text message. */
export class SmeDataApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmeDataApiError";
  }
}

export function isSmeInsufficientBalance(err: unknown): boolean {
  return err instanceof SmeDataApiError && /insufficient balance/i.test(err.message);
}

type SmeOrderCode = "success" | "failure" | "processing";

interface SmeOrderData {
  order_id: number;
  product?: string;
  phone: string;
  amount?: string; // e.g. "NGN245" — see parseAmount below
}

/** SMEData's `amount` field is a free-text string like "NGN245", not a number. */
function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d.]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) && digits ? value : null;
}

interface SmeOrderResponse {
  code: SmeOrderCode;
  message: string;
  data?: SmeOrderData;
}

/** Maps SMEData's raw response code to how Bunben's own purchase record should settle. */
export function mapSmeOrderOutcome(code: SmeOrderCode): "successful" | "failed" | "pending" {
  if (code === "success") return "successful";
  if (code === "failure") return "failed";
  return "pending";
}

/**
 * SMEData.ng's whole API is GET-only with the token as a URL query param (their design,
 * not ours) — cache: "no-store" since this moves real money and must never be served from
 * any cache layer.
 */
async function smeFetch(path: string, params: Record<string, string>): Promise<SmeOrderResponse> {
  const url = new URL(`${SME_API}${path}`);
  url.searchParams.set("token", token());
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  // A hung request must not hold a Server Action open until the platform kills it. A timeout
  // throws, and a throw here is treated as "unknown outcome" (see lib/fulfillment/sme.ts).
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
  const json = (await res.json().catch(() => null)) as SmeOrderResponse | null;

  if (!json || !json.code) {
    throw new SmeDataApiError(`SMEData request failed: HTTP ${res.status}`);
  }
  return json;
}

/**
 * This single GET call both places the order AND spends real money from Bunben's SMEData.ng
 * wallet — there's no separate "confirm" step. SMEData's API also has no request-id/idempotency
 * parameter (unlike VTU), so unlike purchaseMtnData in lib/vtu.ts, a network-level failure here
 * can't be safely retried: if the response is lost in transit, we genuinely don't know whether
 * the order was placed. Callers must not auto-retry on error — see lib/actions/purchase.ts.
 */
export async function purchaseMtnData(params: { phone: string; sizeCode: string }): Promise<{
  orderId: number | null;
  outcome: "successful" | "failed" | "pending";
  message: string;
  /** The real amount SMEData charged Bunben's wallet for this order — the only reliable
   *  live-price signal available (see migration 0020's comment for why). Null if their
   *  response didn't include one (e.g. a failure with no data block). */
  chargedAmount: number | null;
}> {
  const json = await smeFetch("/data", { network: "MTN", phone: params.phone, size: params.sizeCode });
  return {
    orderId: json.data?.order_id ?? null,
    outcome: mapSmeOrderOutcome(json.code),
    message: json.message,
    chargedAmount: parseAmount(json.data?.amount),
  };
}

/** Safe to retry — read-only order-status lookup, used by the manual "Check status" action
 *  and by the webhook handler (which treats the webhook payload only as a hint to look up
 *  the order, never as the source of truth — see app/api/webhooks/smedata/route.ts). */
export async function requerySmeOrder(orderId: string): Promise<{
  outcome: "successful" | "failed" | "pending";
  message: string;
}> {
  const json = await smeFetch("/requery", { orderid: orderId });
  return { outcome: mapSmeOrderOutcome(json.code), message: json.message };
}
