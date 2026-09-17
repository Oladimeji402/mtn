import { type NextRequest, NextResponse } from "next/server";
import { checkVtuBalance } from "@/lib/vtu";
import { notifyAdmins } from "@/lib/notify-admins";

const DEFAULT_THRESHOLD = 5000;

/**
 * Runs once daily at 06:00 UTC (07:00 WAT, before the business day typically starts) via
 * Vercel Cron (see vercel.json) so admins get warned about a low VTU.ng wallet before a
 * customer purchase fails, not just after (the reactive path in lib/actions/purchase.ts
 * handles the "after" case). Once-daily, not more frequent, because this project is on
 * Vercel's Hobby plan, which only allows once-per-day cron schedules — anything more
 * frequent fails at deploy time. Won't run on localhost — cron triggers only exist once
 * this is deployed.
 */
export async function GET(request: NextRequest) {
  // Fails closed: an unset CRON_SECRET must not leave this open to the public — it
  // would otherwise let anyone read Bunben's real VTU.ng wallet balance and trigger
  // unlimited balance checks against VTU's API.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threshold = Number(process.env.VTU_LOW_BALANCE_THRESHOLD ?? DEFAULT_THRESHOLD);

  try {
    const { balance, currency } = await checkVtuBalance();

    if (balance < threshold) {
      await notifyAdmins({
        type: "vtu_balance_low",
        title: "VTU.ng wallet balance is low",
        message: `Balance is ${currency} ${balance.toLocaleString()}, below the ₦${threshold.toLocaleString()} threshold. Fund it directly on vtu.ng to avoid purchase failures.`,
      });
    }

    return NextResponse.json({ balance, threshold });
  } catch (err) {
    console.error("VTU balance check failed", err);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
