import "server-only";
import crypto from "crypto";
import type { NextRequest } from "next/server";

/**
 * The SIM gateway is a program running at the client's premises that calls these endpoints.
 * It authenticates with one shared secret. Fails closed: an unset or short secret means
 * nobody gets in. Compared as fixed-length digests so the check is constant-time.
 */
export function isGatewayAuthorized(request: NextRequest): boolean {
  const expected = process.env.GATEWAY_API_TOKEN;
  if (!expected || expected.length < 24) return false;

  const header = request.headers.get("authorization") ?? "";
  const got = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!got) return false;

  const a = crypto.createHash("sha256").update(expected).digest();
  const b = crypto.createHash("sha256").update(got).digest();
  return crypto.timingSafeEqual(a, b);
}

export const MSISDN_PATTERN = /^0\d{10}$/;

/** Pulls a list of valid SIM numbers out of an untrusted request body. */
export function parseLiveSims(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  if (!value.every((v) => typeof v === "string" && MSISDN_PATTERN.test(v))) return null;
  return value as string[];
}

/** SIM problems the gateway reports with its heartbeat. Malformed entries are dropped. */
export function parseSimAlerts(value: unknown): { msisdn: string; reason: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 20)
    .filter((a) => a && typeof a.msisdn === "string" && MSISDN_PATTERN.test(a.msisdn) && typeof a.reason === "string")
    .map((a) => ({ msisdn: a.msisdn, reason: a.reason.slice(0, 300) }));
}
