import "server-only";
import crypto from "crypto";

/**
 * Client for MTN's official "Customer Data Transfer" API (developers.mtn.com, v3.0.0): moves part
 * of a customer's ACTIVE data bundle to another MTN number, so the client's own subscriptions
 * (and their price) are what get used. Built from MTN's published OpenAPI spec:
 *
 *   auth      OAuth2 client credentials -> POST {base}/oauth/access_token (token lasts ~1 hour)
 *   transfer  POST {base}/customers/{senderMsisdn}   body: receiverMsisdn, type, targetSystem,
 *                                                    transferAmount, callbackUrl, ...
 *   status    GET  {base}/customers/transactionStatus?transactionId=...
 *
 * The spec leaves some values open (what `targetSystem` and `transferAmount`'s unit are, and the
 * words used for `transactionState`), so they come from settings — see mtnConfig(). Anything the
 * code doesn't recognise is treated as "pending"/"unknown" and held for a person, never as a
 * success: a wrong guess costs real data or real money.
 */

const DEFAULT_BASE = "https://api.mtn.com/v1";
const REQUEST_TIMEOUT_MS = 25_000;

const csv = (v: string | undefined, fallback: string[]) =>
  v ? v.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : fallback;

export function mtnConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    base: (env.MTN_API_BASE || DEFAULT_BASE).replace(/\/+$/, ""),
    key: env.MTN_CONSUMER_KEY ?? "",
    secret: env.MTN_CONSUMER_SECRET ?? "",
    targetSystem: env.MTN_TRANSFER_TARGET_SYSTEM ?? "",
    type: env.MTN_TRANSFER_TYPE || "data",
    unit: (env.MTN_TRANSFER_AMOUNT_UNIT || "mb").toLowerCase(),
    channelId: env.MTN_ORIGIN_CHANNEL_ID ?? "",
    callbackUrl: env.MTN_CALLBACK_URL ?? "",
    // What MTN's `transactionState` looks like is not in the spec; these are starting guesses to
    // be replaced from a real response. Unlisted states are treated as still pending.
    successStates: csv(env.MTN_SUCCESS_STATES, ["COMPLETED", "SUCCESSFUL", "SUCCESS"]),
    pendingStates: csv(env.MTN_PENDING_STATES, ["PENDING", "PROCESSING", "ACCEPTED", "INITIATED", "IN_PROGRESS"]),
    failedStates: csv(env.MTN_FAILED_STATES, ["FAILED", "REJECTED", "CANCELLED", "CANCELED", "EXPIRED", "DECLINED"]),
    limitPattern: new RegExp(env.MTN_LIMIT_PATTERN || "daily|limit|exceed|maximum|too many", "i"),
    bundlePattern: new RegExp(env.MTN_BUNDLE_PATTERN || "insufficient|not enough|no data|low balance|balance", "i"),
  };
}
export type MtnConfig = ReturnType<typeof mtnConfig>;

/** True when there is enough configuration to attempt a transfer at all. */
export function mtnConfigured(cfg: MtnConfig = mtnConfig()): boolean {
  return !!(cfg.key && cfg.secret && cfg.targetSystem);
}

/** 08031234567 -> 2348031234567 (the international format MTN's spec asks for). */
export function toE123(local: string): string {
  const digits = local.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return digits;
  if (digits.startsWith("0") && digits.length === 11) return `234${digits.slice(1)}`;
  throw new Error(`Not a Nigerian mobile number: ${local}`);
}

export function transferAmount(sizeMb: number, unit: string): string {
  switch (unit) {
    case "gb": return String(sizeMb / 1000);
    case "kb": return String(sizeMb * 1000);
    case "bytes": return String(sizeMb * 1_000_000);
    default: return String(sizeMb);
  }
}

/**
 * MTN asks for a unique 5–20 character id per request (ASCII letters, digits, + / = -), and says
 * duplicate detection "is not always guaranteed" — so it is derived from our own job id and stays
 * the same if that exact attempt is ever repeated.
 */
export function makeTransactionId(jobId: string): string {
  return crypto.createHash("sha256").update(`bunben:${jobId}`).digest("hex").slice(0, 20);
}

// ---- token cache ---------------------------------------------------------------------------
let cached: { token: string; expiresAt: number } | null = null;

async function getToken(cfg: MtnConfig, fetchImpl: typeof fetch): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const res = await fetchImpl(`${cfg.base}/oauth/access_token?grant_type=client_credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.key, client_secret: cfg.secret }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: string | number } | null;
  if (!res.ok || !json?.access_token) throw new MtnAuthError(`MTN sign-in failed: HTTP ${res.status}`);
  cached = { token: json.access_token, expiresAt: Date.now() + Number(json.expires_in ?? 3000) * 1000 };
  return cached.token;
}

export function resetMtnTokenCache() {
  cached = null;
}

/** Our credentials were refused: an admin problem, not a customer or SIM problem. */
export class MtnAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MtnAuthError";
  }
}

// ---- classification (pure) ------------------------------------------------------------------
export type MtnTransferResult =
  | { kind: "success"; message: string }
  | { kind: "pending"; message: string }
  | { kind: "rejected"; message: string; fatal?: boolean }
  | { kind: "limit"; message: string }
  | { kind: "bundle"; message: string }
  | { kind: "unknown"; message: string };

interface MtnBody {
  statusCode?: string | number;
  statusMessage?: string;
  supportMessage?: string;
  message?: string;
  data?: { transactionState?: string; notification?: string; description?: string; accountBalances?: unknown };
}

const OK_CODES = new Set(["0000", "0", "200", "201", "202"]);

/**
 * Decides what MTN's answer means. SUCCESS requires an explicitly recognised transaction state;
 * an accepted-but-unrecognised answer is "pending" (verified later with the status call), and
 * anything that could mean the data moved but we can't tell (5xx, timeouts) is "unknown".
 */
export function classifyTransfer(httpStatus: number, body: MtnBody | null, cfg: MtnConfig): MtnTransferResult {
  const text = [body?.statusMessage, body?.message, body?.data?.notification, body?.data?.description, body?.supportMessage]
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" | ")
    .slice(0, 300);

  if (httpStatus === 401 || httpStatus === 403) {
    return { kind: "rejected", fatal: true, message: `MTN refused our credentials or permission (HTTP ${httpStatus}) ${text}`.trim() };
  }
  if (httpStatus >= 500 || httpStatus === 0) {
    return { kind: "unknown", message: `MTN server error (HTTP ${httpStatus}) ${text}`.trim() };
  }
  if (httpStatus >= 400) {
    if (cfg.limitPattern.test(text)) return { kind: "limit", message: text };
    if (cfg.bundlePattern.test(text)) return { kind: "bundle", message: text };
    return { kind: "rejected", message: text || `Rejected (HTTP ${httpStatus})` };
  }

  const code = body?.statusCode !== undefined ? String(body.statusCode) : "";
  if (code && !OK_CODES.has(code)) {
    if (cfg.limitPattern.test(text)) return { kind: "limit", message: text };
    if (cfg.bundlePattern.test(text)) return { kind: "bundle", message: text };
    return { kind: "rejected", message: text || `MTN status ${code}` };
  }

  const state = String(body?.data?.transactionState ?? "").toUpperCase();
  if (state && cfg.failedStates.includes(state)) return { kind: "rejected", message: text || `State ${state}` };
  if (state && cfg.successStates.includes(state)) return { kind: "success", message: text || `State ${state}` };
  if (state && cfg.pendingStates.includes(state)) return { kind: "pending", message: text || `State ${state}` };

  // Accepted, but the state is missing or not one we know: verify rather than assume.
  return { kind: "pending", message: text || `Accepted, state "${state || "none"}" not recognised` };
}

// ---- calls ---------------------------------------------------------------------------------
function headers(cfg: MtnConfig, token: string, transactionId: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    transactionId,
    "x-country-code": "NG",
    ...(cfg.channelId ? { "x-origin-channelid": cfg.channelId } : {}),
    ...extra,
  };
}

async function readBody(res: Response): Promise<MtnBody | null> {
  return (await res.json().catch(() => null)) as MtnBody | null;
}

/**
 * Sends the transfer. A network error or timeout is thrown — the caller must treat that as
 * "unknown", not "failed": MTN may already have moved the data.
 */
export async function sendTransfer(
  params: { senderMsisdn: string; receiverMsisdn: string; sizeMb: number; transactionId: string },
  cfg: MtnConfig = mtnConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ result: MtnTransferResult; raw: string }> {
  const token = await getToken(cfg, fetchImpl);
  const res = await fetchImpl(`${cfg.base}/customers/${toE123(params.senderMsisdn)}`, {
    method: "POST",
    headers: headers(cfg, token, params.transactionId),
    body: JSON.stringify({
      receiverMsisdn: toE123(params.receiverMsisdn),
      type: cfg.type,
      targetSystem: cfg.targetSystem,
      transferAmount: transferAmount(params.sizeMb, cfg.unit),
      ...(cfg.callbackUrl ? { callbackUrl: cfg.callbackUrl } : {}),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 401) resetMtnTokenCache();
  const body = await readBody(res);
  return { result: classifyTransfer(res.status, body, cfg), raw: JSON.stringify(body ?? {}).slice(0, 600) };
}

/** Read-only, safe to repeat: what does MTN say happened to this transaction? */
export async function fetchTransferStatus(
  transactionId: string,
  cfg: MtnConfig = mtnConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ result: MtnTransferResult; raw: string; httpStatus: number }> {
  const token = await getToken(cfg, fetchImpl);
  const res = await fetchImpl(`${cfg.base}/customers/transactionStatus?transactionId=${encodeURIComponent(transactionId)}`, {
    headers: headers(cfg, token, transactionId, { targetSystem: cfg.targetSystem }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 401) resetMtnTokenCache();
  const body = await readBody(res);
  return { result: classifyTransfer(res.status, body, cfg), raw: JSON.stringify(body ?? {}).slice(0, 600), httpStatus: res.status };
}
