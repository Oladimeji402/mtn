"use server";

import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { settlePaystackTransaction } from "@/lib/paystack";
import { MAX_FUNDING_AMOUNT, MIN_FUNDING_AMOUNT } from "@/lib/constants";

function generateReference() {
  return `FUND-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

export interface InitiateFundingResult {
  reference: string;
  amountKobo: number;
  email: string;
  publicKey: string;
}

/**
 * Records the funding intent (who, how much, under what reference) BEFORE any money
 * moves. The Paystack Inline popup then runs entirely client-side against this
 * reference; settlePaystackTransaction looks the intent back up by reference so a
 * client can never credit an arbitrary user or amount by tampering with the popup.
 */
export async function initiateWalletFundingAction(amount: number): Promise<InitiateFundingResult> {
  if (amount < MIN_FUNDING_AMOUNT || amount > MAX_FUNDING_AMOUNT) {
    throw new Error(`Amount must be between ₦${MIN_FUNDING_AMOUNT} and ₦${MAX_FUNDING_AMOUNT.toLocaleString()}.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!publicKey) throw new Error("Payments are not configured yet.");

  const reference = generateReference();
  const admin = createAdminClient();
  const { error } = await admin.from("payment_events").insert({
    provider: "paystack",
    event_reference: reference,
    payload: { user_id: user.id, amount, email: user.email },
  });
  if (error) throw new Error("Could not start payment. Please try again.");

  return { reference, amountKobo: Math.round(amount * 100), email: user.email, publicKey };
}

export interface ConfirmFundingResult {
  outcome: "successful" | "failed" | "pending";
  newBalance?: number;
  reason?: string;
}

/** Called right after the Paystack Inline popup reports success, for immediate UI feedback. */
export async function confirmWalletFundingAction(reference: string): Promise<ConfirmFundingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("payment_events")
    .select("payload")
    .eq("provider", "paystack")
    .eq("event_reference", reference)
    .maybeSingle();

  const payload = event?.payload as { user_id?: string } | undefined;
  if (!payload || payload.user_id !== user.id) {
    throw new Error("This payment reference does not belong to your account.");
  }

  const result = await settlePaystackTransaction(reference);

  if (result.outcome === "already_processed") {
    return { outcome: result.priorOutcome === "successful" ? "successful" : "failed" };
  }
  if (result.outcome === "successful") {
    return { outcome: "successful", newBalance: result.newBalance };
  }
  if (result.outcome === "failed") {
    return { outcome: "failed", reason: result.reason };
  }
  return { outcome: "pending" };
}
