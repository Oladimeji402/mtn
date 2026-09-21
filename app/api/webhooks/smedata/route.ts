import { reportError } from "@/lib/error-log";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { finalizePurchase } from "@/lib/purchase-fulfillment";
import { requerySmeOrder } from "@/lib/smedata";

/**
 * SMEData.ng's webhook has no documented signature/verification method — unlike VTU and
 * Monipay, we cannot trust that a request here actually came from SMEData.ng, or that its
 * claimed status is real. So the payload is used for exactly one thing: which order_id to
 * look up. The actual outcome always comes from calling requerySmeOrder ourselves (an
 * authenticated, read-only call using our own token) — a forged payload can at worst point
 * us at a real order we already own, whose real status we'd then just re-confirm.
 */
function extractOrderId(body: unknown, url: URL): string | null {
  if (body && typeof body === "object" && "data" in body) {
    const data = (body as { data?: { order_id?: unknown } }).data;
    if (data?.order_id !== undefined && data.order_id !== null) return String(data.order_id);
  }
  const fromQuery = url.searchParams.get("order_id");
  return fromQuery;
}

async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => null);
  const orderId = extractOrderId(body, url);

  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  try {
    const admin = createAdminClient();
    const { data: purchase } = await admin
      .from("purchases")
      .select("id")
      .eq("provider_reference", orderId)
      .maybeSingle();

    if (!purchase) {
      return NextResponse.json({ received: true });
    }

    const order = await requerySmeOrder(orderId);
    if (order.outcome !== "pending") {
      await finalizePurchase({
        purchaseId: purchase.id,
        outcome: order.outcome,
        providerReference: orderId,
        failureReason: order.outcome === "failed" ? `SMEData: ${order.message}` : null,
      });
    }
  } catch (err) {
    await reportError({ source: "webhook:smedata", error: err, userId: null });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}
