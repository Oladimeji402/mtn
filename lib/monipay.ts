import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const MONIPAY_API = "https://api.monipay.ng";

function secretKey() {
  const key = process.env.MONIPAY_SECRET_KEY;
  if (!key) throw new Error("MONIPAY_SECRET_KEY is not set.");
  return key;
}

// Confirmed against the live API: /transaction/initialize rejects the secret key
// ("Use public key for this endpoint") despite the integration spec saying either
// key works. Verify and the webhook signature still use the secret key.
function publicKey() {
  const key = process.env.MONIPAY_PUBLIC_KEY;
  if (!key) throw new Error("MONIPAY_PUBLIC_KEY is not set.");
  return key;
}

/** Constant-time comparison — a plain === on signatures is a timing side-channel. */
export function verifyMonipaySignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}

interface MonipayInitializeResponse {
  status: boolean;
  message?: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

/**
 * Runs server-side (Server Action) so the call itself never touches the browser —
 * the client only ever receives the resulting authorization_url and is redirected to
 * Monipay's hosted checkout. Uses the public key, per the live API's own validation.
 */
export async function initializeMonipayTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
}) {
  const res = await fetch(`${MONIPAY_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${publicKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      currency: "NGN",
    }),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as MonipayInitializeResponse | null;
  if (!res.ok) {
    throw new Error(json?.message || `Monipay initialize failed: HTTP ${res.status}`);
  }
  if (!json?.status || !json.data?.authorization_url) {
    throw new Error(json?.message || "Monipay did not return a checkout URL.");
  }
  return json.data;
}

interface MonipayVerifyResponse {
  status: boolean;
  message?: string;
  data: {
    status: string; // "success" / "APPROVED" / "failed" / "pending" / ... — normalized below
    reference: string;
    amount: number; // kobo
    gateway_response?: string;
  };
}

const SUCCESS_STATUSES = new Set(["success", "approved"]);
const PENDING_STATUSES = new Set(["pending", "queued", "ongoing", "processing"]);

async function verifyWithMonipay(reference: string) {
  const res = await fetch(`${MONIPAY_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Monipay verify request failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as MonipayVerifyResponse;
  return json.data;
}

export type SettleResult =
  | { outcome: "successful"; newBalance: number }
  | { outcome: "failed"; reason: string }
  | { outcome: "pending" }
  | { outcome: "already_processed"; priorOutcome: string };

/**
 * The single source of truth for "did this payment actually happen, and did we credit
 * it." Called from both the webhook (authoritative, works even if the user's browser
 * is closed) and the client-triggered confirm step after the redirect back from
 * Monipay's hosted checkout. Both paths converge here so there is exactly one
 * crediting code path to reason about.
 *
 * Idempotent by construction: payment_events.processed_at gates re-processing, and
 * fn_credit_wallet_from_payment's unique constraint on wallet_ledger.reference is the
 * hard backstop if this function is somehow entered twice concurrently.
 */
export async function settleMonipayTransaction(reference: string): Promise<SettleResult> {
  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from("payment_events")
    .select("*")
    .eq("provider", "monipay")
    .eq("event_reference", reference)
    .maybeSingle();

  if (eventError || !event) {
    throw new Error(`Unknown payment reference: ${reference}`);
  }

  if (event.processed_at) {
    const payload = event.payload as { outcome?: string };
    return { outcome: "already_processed", priorOutcome: payload.outcome ?? "unknown" };
  }

  const payload = event.payload as { user_id: string; amount: number; email: string };
  const tx = await verifyWithMonipay(reference);
  const status = tx.status.toLowerCase();

  if (PENDING_STATUSES.has(status)) {
    return { outcome: "pending" };
  }

  const amountMatches = tx.amount === Math.round(payload.amount * 100);

  if (!SUCCESS_STATUSES.has(status) || !amountMatches) {
    const reason = !amountMatches
      ? "Payment could not be verified."
      : tx.gateway_response || "Payment was not successful.";

    await admin
      .from("payment_events")
      .update({ processed_at: new Date().toISOString(), payload: { ...payload, outcome: "failed", reason } })
      .eq("id", event.id);

    await admin.from("notifications").insert({
      user_id: payload.user_id,
      type: "wallet_funding_failed",
      title: "Wallet funding failed",
      message: `₦${payload.amount.toLocaleString()} funding failed.`,
    });

    return { outcome: "failed", reason };
  }

  const { data: wallet, error: creditError } = await admin.rpc("fn_credit_wallet_from_payment", {
    p_user_id: payload.user_id,
    p_amount: payload.amount,
    p_reference: reference,
    p_description: "Wallet funding via Monipay",
  });

  if (creditError) {
    // Unique violation on wallet_ledger.reference means another path (webhook vs.
    // client confirm, racing each other) already credited this — treat as success.
    if (creditError.code === "23505") {
      const { data: balanceRow } = await admin
        .from("wallets")
        .select("balance")
        .eq("user_id", payload.user_id)
        .single();
      return { outcome: "successful", newBalance: balanceRow?.balance ?? 0 };
    }
    throw new Error(`Failed to credit wallet: ${creditError.message}`);
  }

  await admin
    .from("payment_events")
    .update({ processed_at: new Date().toISOString(), payload: { ...payload, outcome: "successful" } })
    .eq("id", event.id);

  await admin.from("notifications").insert({
    user_id: payload.user_id,
    type: "wallet_funded",
    title: "Wallet funded",
    message: `₦${payload.amount.toLocaleString()} added to your wallet.`,
  });

  return { outcome: "successful", newBalance: wallet.balance };
}
