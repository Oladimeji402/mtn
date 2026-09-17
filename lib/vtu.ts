import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const VTU_API = "https://vtu.ng/wp-json";

function credentials() {
  const username = process.env.VTU_USERNAME;
  const password = process.env.VTU_PASSWORD;
  if (!username || !password) throw new Error("VTU_USERNAME/VTU_PASSWORD are not set.");
  return { username, password };
}

function userPin() {
  const pin = process.env.VTU_USER_PIN;
  if (!pin) throw new Error("VTU_USER_PIN is not set.");
  return pin;
}

/** Constant-time comparison — a plain === on signatures is a timing side-channel. */
export function verifyVtuWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", userPin()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}

interface VtuTokenResponse {
  token: string;
  user_email: string;
}

/**
 * VTU.ng's JWT belongs to Bunben's one reseller account, not to individual end users —
 * every purchase from every customer shares this single cached token. It's persisted in
 * Postgres (not just in-memory) so separate serverless instances share it instead of each
 * logging in independently; VTU.ng invalidates the previous token every time a new one is
 * issued, so unnecessary logins actively break other warm instances still holding the old one.
 */
async function loginToVtu(): Promise<string> {
  const { username, password } = credentials();
  const res = await fetch(`${VTU_API}/jwt-auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `VTU login failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as VtuTokenResponse;
  if (!json.token) throw new Error("VTU login did not return a token.");

  // Tokens last 7 days; cache for 6 to leave a safety margin.
  const expiresAt = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  await admin
    .from("vtu_auth_state")
    .update({ token: json.token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq("id", true);

  return json.token;
}

async function getCachedToken(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vtu_auth_state")
    .select("token, expires_at")
    .eq("id", true)
    .maybeSingle();

  if (!data?.token || !data.expires_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data.token;
}

async function getAccessToken(): Promise<string> {
  const cached = await getCachedToken();
  return cached ?? loginToVtu();
}

interface VtuErrorBody {
  code?: string;
  message?: string;
}

/** Carries VTU's own error `code` (e.g. "insufficient_funds") so callers can react to
 *  specific failure kinds instead of parsing message text. */
export class VtuApiError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "VtuApiError";
    this.code = code;
  }
}

const AUTH_ERROR_CODES = new Set(["jwt_auth_failed", "jwt_auth_invalid_token", "rest_forbidden"]);

/**
 * Authorized VTU.ng request with one automatic retry: if the cached token was silently
 * invalidated (e.g. another instance logged in and issued a newer one — VTU.ng only keeps
 * the latest token active), force a fresh login once and retry, rather than surfacing an
 * auth error to the customer for something that isn't really an outage.
 */
async function vtuFetch<T>(path: string, init: RequestInit = {}, allowRetry = true): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${VTU_API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const body = json as VtuErrorBody | null;
    if (allowRetry && body?.code && AUTH_ERROR_CODES.has(body.code)) {
      await loginToVtu();
      return vtuFetch<T>(path, init, false);
    }
    throw new VtuApiError(body?.message || `VTU request failed: HTTP ${res.status}`, body?.code);
  }

  return json as T;
}

/** Bunben's own real-money VTU.ng wallet balance — separate from any customer's in-app
 *  balance, and not replenished automatically by customer payments via Monipay. */
export async function checkVtuBalance(): Promise<{ balance: number; currency: string }> {
  const res = await vtuFetch<{ data: { balance: number; currency: string } }>("/api/v2/balance");
  return res.data;
}

export interface VtuDataVariation {
  variation_id: number;
  service_name: string;
  service_id: string;
  data_plan: string;
  price: string;
  availability: "Available" | "Unavailable";
}

/** Public endpoint — no auth needed. Used to look up real variation_ids for data_plans. */
export async function fetchMtnDataVariations(): Promise<VtuDataVariation[]> {
  const res = await fetch(`${VTU_API}/api/v2/variations/data?service_id=mtn`, { cache: "no-store" });
  if (!res.ok) throw new Error(`VTU variations request failed: HTTP ${res.status}`);
  const json = (await res.json()) as { data: VtuDataVariation[] };
  return json.data ?? [];
}

export type VtuOrderStatus =
  | "completed-api"
  | "processing-api"
  | "queued-api"
  | "initiated-api"
  | "cancelled"
  | "pending"
  | "failed"
  | "refunded"
  | "on-hold";

export interface VtuOrderData {
  order_id: number;
  status: VtuOrderStatus;
  request_id: string;
  [key: string]: unknown;
}

interface VtuOrderResponse {
  code: string;
  message: string;
  data: VtuOrderData;
}

export async function purchaseMtnAirtime(params: {
  requestId: string;
  phone: string;
  amount: number;
}): Promise<VtuOrderData> {
  const res = await vtuFetch<VtuOrderResponse>("/api/v2/airtime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: params.requestId,
      phone: params.phone,
      service_id: "mtn",
      amount: Math.round(params.amount),
    }),
  });
  return res.data;
}

export async function purchaseMtnData(params: {
  requestId: string;
  phone: string;
  variationId: string;
}): Promise<VtuOrderData> {
  const res = await vtuFetch<VtuOrderResponse>("/api/v2/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request_id: params.requestId,
      phone: params.phone,
      service_id: "mtn",
      variation_id: params.variationId,
    }),
  });
  return res.data;
}

/** Fallback for orders stuck in a processing-ish state — VTU.ng's webhook only fires for
 *  refunds and manually-completed orders, not normal automated completions. */
export async function requeryVtuOrder(requestId: string): Promise<VtuOrderData> {
  const res = await vtuFetch<VtuOrderResponse>("/api/v2/requery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_id: requestId }),
  });
  return res.data;
}

const SUCCESS_STATUSES = new Set<VtuOrderStatus>(["completed-api"]);
const FAILURE_STATUSES = new Set<VtuOrderStatus>(["refunded", "failed", "cancelled"]);

/** Maps a raw VTU order status to how Bunben's own purchase record should settle. */
export function mapVtuOrderOutcome(status: VtuOrderStatus): "successful" | "failed" | "pending" {
  if (SUCCESS_STATUSES.has(status)) return "successful";
  if (FAILURE_STATUSES.has(status)) return "failed";
  return "pending";
}
