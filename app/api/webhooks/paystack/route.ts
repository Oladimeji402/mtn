import { type NextRequest, NextResponse } from "next/server";
import { verifyPaystackSignature, settlePaystackTransaction } from "@/lib/paystack";

/**
 * Paystack webhook. This is the authoritative crediting path — it fires from
 * Paystack's servers regardless of whether the paying user's browser is still open,
 * unlike the client-triggered confirm action in lib/actions/wallet.ts (which exists
 * only for fast UI feedback). Both converge on settlePaystackTransaction, which is
 * idempotent, so it doesn't matter which one runs first.
 *
 * Paystack retries undelivered/non-200 webhooks for up to 72 hours, so this must
 * respond quickly and handle being called more than once for the same event.
 */
export async function POST(request: NextRequest) {
  // Must read the RAW body before any JSON parsing — the signature is computed over
  // the exact bytes Paystack sent, and Next.js's body parsing would otherwise get in
  // the way of reproducing that hash.
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event: string; data: { reference: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only wallet funding produces a charge.success event we care about. Anything else
  // (subscriptions, transfers — features this app doesn't use) is acknowledged and
  // ignored, so Paystack doesn't retry it into the ground.
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  try {
    await settlePaystackTransaction(event.data.reference);
  } catch (err) {
    // Log and still return 200-range only for cases we've deliberately decided are
    // not retryable; an unexpected error should surface as a failure so Paystack
    // retries, in case it was transient (e.g. our database being briefly unreachable).
    console.error("Paystack webhook processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
