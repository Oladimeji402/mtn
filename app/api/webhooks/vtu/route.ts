import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { mapVtuOrderOutcome, verifyVtuWebhookSignature, type VtuOrderStatus } from "@/lib/vtu";

/**
 * VTU.ng webhook. Unlike Monipay/Paystack, this is NOT the primary fulfillment signal —
 * per VTU.ng's own docs, "Order Completed" only fires when an admin manually completes an
 * order, not for normal automated ones (those are settled synchronously in
 * lib/actions/purchase.ts from the purchase call's own response). This webhook mainly
 * exists for automatic refunds that happen after a purchase call already returned
 * "processing-api", plus that rare manual-complete case.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyVtuWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { order_id: number; status: VtuOrderStatus; request_id: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const outcome = mapVtuOrderOutcome(payload.status);
  if (outcome === "pending") {
    return NextResponse.json({ received: true });
  }

  try {
    const admin = createAdminClient();
    const { data: purchase } = await admin
      .from("purchases")
      .select("id")
      .eq("reference", payload.request_id)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ received: true });
    }

    await finalizePurchase({
      purchaseId: purchase.id,
      outcome,
      providerReference: String(payload.order_id),
      failureReason: outcome === "failed" ? `VTU order ${payload.status}` : null,
    });
  } catch (err) {
    console.error("VTU webhook processing failed", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
