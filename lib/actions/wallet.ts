"use server";

import crypto from "crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeMonipayTransaction, settleMonipayTransaction } from "@/lib/monipay";
import { assertNotRateLimited } from "@/lib/rate-limit";
import { UserError, type ActionResult } from "@/lib/errors";
import { runAction } from "@/lib/run-action";
import { MAX_FUNDING_AMOUNT, MIN_FUNDING_AMOUNT } from "@/lib/constants";

function generateReference() {
  return `FUND-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

/** Best-effort origin for building the callback_url — Server Actions have no `window`. */
async function getOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("Could not determine the app's URL for the payment callback.");
  return `${proto}://${host}`;
}

export interface InitiateFundingResult {
  authorizationUrl: string;
}

/**
 * Records the funding intent (who, how much, under what reference) BEFORE any money
 * moves, then asks Monipay to open a hosted checkout for it. settleMonipayTransaction
 * looks the intent back up by reference so a returning browser can never credit an
 * arbitrary user or amount by tampering with the redirect.
 */
export async function initiateWalletFundingAction(amount: number): Promise<ActionResult<InitiateFundingResult>> {
  return runAction("initiateWalletFunding", () => initiateWalletFunding(amount));
}

async function initiateWalletFunding(amount: number): Promise<InitiateFundingResult> {
  if (amount < MIN_FUNDING_AMOUNT || amount > MAX_FUNDING_AMOUNT) {
    throw new UserError(`Amount must be between ₦${MIN_FUNDING_AMOUNT.toLocaleString()} and ₦${MAX_FUNDING_AMOUNT.toLocaleString()}.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new UserError("Please log in again to continue.");

  await assertNotRateLimited("wallet_funding_initiate", 5, 300);

  const reference = generateReference();
  const admin = createAdminClient();
  const { error } = await admin.from("payment_events").insert({
    provider: "monipay",
    event_reference: reference,
    payload: { user_id: user.id, amount, email: user.email },
  });
  if (error) throw new Error("Could not start payment");

  const origin = await getOrigin();
  const callbackUrl = `${origin}/dashboard/wallet?monipay_reference=${encodeURIComponent(reference)}`;

  const { authorization_url } = await initializeMonipayTransaction({
    email: user.email,
    amountKobo: Math.round(amount * 100),
    reference,
    callbackUrl,
  });

  return { authorizationUrl: authorization_url };
}

export interface ConfirmFundingResult {
  outcome: "successful" | "failed" | "pending";
  newBalance?: number;
}

/** Called when the browser lands back on /dashboard/wallet after Monipay's checkout. */
export async function confirmWalletFundingAction(reference: string): Promise<ActionResult<ConfirmFundingResult>> {
  return runAction("confirmWalletFunding", () => confirmWalletFunding(reference));
}

async function confirmWalletFunding(reference: string): Promise<ConfirmFundingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UserError("Please log in again to continue.");

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("payment_events")
    .select("payload")
    .eq("provider", "monipay")
    .eq("event_reference", reference)
    .maybeSingle();

  const payload = event?.payload as { user_id?: string } | undefined;
  if (!payload || payload.user_id !== user.id) {
    throw new UserError("We couldn't find that payment.");
  }

  const result = await settleMonipayTransaction(reference);

  if (result.outcome === "already_processed") {
    // The webhook (which races this client-triggered confirm) already settled it —
    // common, since it fires as soon as Monipay confirms the transfer, often before the
    // browser even redirects back. Still fetch the real balance rather than omitting it:
    // the UI would otherwise fall back to the pre-funding balance it was rendered with.
    if (result.priorOutcome !== "successful") {
      return { outcome: "failed" };
    }
    const { data: wallet } = await admin.from("wallets").select("balance").eq("user_id", user.id).single();
    return { outcome: "successful", newBalance: wallet?.balance ?? undefined };
  }
  if (result.outcome === "successful") {
    return { outcome: "successful", newBalance: result.newBalance };
  }
  if (result.outcome === "failed") {
    return { outcome: "failed" };
  }
  return { outcome: "pending" };
}
