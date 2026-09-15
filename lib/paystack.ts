import "server-only";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const PAYSTACK_API = "https://api.paystack.co";

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set.");
  return key;
}

/** Constant-time comparison — a plain === on signatures is a timing side-channel. */
export function verifyPaystackSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha512", secretKey()).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const gotBuf = Buffer.from(signatureHeader, "hex");
  if (expectedBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}

interface PaystackVerifyResponse {
  status: boolean;
  data: {
    status: "success" | "failed" | "abandoned" | "pending" | "queued" | "ongoing";
    reference: string;
    amount: number; // kobo
    currency: string;
    gateway_response: string;
  };
}

async function verifyWithPaystack(reference: string) {
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Paystack verify request failed: HTTP ${res.status}`);
  }
  const json = (await res.json()) as PaystackVerifyResponse;
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
 * is closed) and the client-triggered confirm step (for fast UI feedback). Both paths
 * converge here so there is exactly one crediting code path to reason about.
 *
 * Idempotent by construction: payment_events.processed_at gates re-processing, and
 * fn_credit_wallet_from_payment's unique constraint on wallet_ledger.reference is the
 * hard backstop if this function is somehow entered twice concurrently.
 */
export async function settlePaystackTransaction(reference: string): Promise<SettleResult> {
  const admin = createAdminClient();

  const { data: event, error: eventError } = await admin
    .from("payment_events")
    .select("*")
    .eq("provider", "paystack")
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
  const tx = await verifyWithPaystack(reference);

  if (tx.status === "pending" || tx.status === "queued" || tx.status === "ongoing") {
    return { outcome: "pending" };
  }

  const amountMatches = tx.amount === Math.round(payload.amount * 100);

  if (tx.status !== "success" || !amountMatches) {
    const reason = !amountMatches
      ? "Amount mismatch between recorded intent and Paystack response."
      : tx.gateway_response || "Payment was not successful.";

    await admin
      .from("payment_events")
      .update({ processed_at: new Date().toISOString(), payload: { ...payload, outcome: "failed", reason } })
      .eq("id", event.id);

    await admin.from("notifications").insert({
      user_id: payload.user_id,
      type: "wallet_funding_failed",
      title: "Wallet funding failed",
      message: `Your ₦${payload.amount.toLocaleString()} wallet funding attempt was not successful.`,
    });

    return { outcome: "failed", reason };
  }

  const { data: wallet, error: creditError } = await admin.rpc("fn_credit_wallet_from_payment", {
    p_user_id: payload.user_id,
    p_amount: payload.amount,
    p_reference: reference,
    p_description: "Wallet funding via Paystack",
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
    message: `₦${payload.amount.toLocaleString()} was added to your wallet. New balance: ₦${Number(wallet.balance).toLocaleString()}.`,
  });

  return { outcome: "successful", newBalance: wallet.balance };
}
