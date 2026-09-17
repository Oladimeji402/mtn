import { type NextRequest, NextResponse } from "next/server";
import { verifyMonipaySignature, settleMonipayTransaction } from "@/lib/monipay";

/**
 * Monipay webhook. This is the authoritative crediting path — it fires from
 * Monipay's servers regardless of whether the paying user's browser is still open,
 * unlike the client-triggered confirm action in lib/actions/wallet.ts (which exists
 * only for fast UI feedback right after the redirect back from checkout). Both
 * converge on settleMonipayTransaction, which is idempotent, so it doesn't matter
 * which one runs first.
 */
export async function POST(request: NextRequest) {
  // Must read the RAW body before any JSON parsing — the signature is computed over
  // the exact bytes Monipay sent, and Next.js's body parsing would otherwise get in
  // the way of reproducing that hash.
  const rawBody = await request.text();
  const signature = request.headers.get("x-monipay-signature");

  if (!verifyMonipaySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event: string; data: { reference: string } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only wallet funding produces a charge.success event we care about. Anything else
  // is acknowledged and ignored, so Monipay doesn't retry it into the ground.
  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  try {
    await settleMonipayTransaction(event.data.reference);
  } catch (err) {
    // Log and let a non-2xx response signal Monipay to retry — in case this was a
    // transient failure (e.g. our database being briefly unreachable).
    console.error("Monipay webhook processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
