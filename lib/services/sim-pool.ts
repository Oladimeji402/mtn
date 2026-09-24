import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdmin } from "@/lib/services/admin";
import type { FulfillmentJobStatus, SimLoginStatus } from "@/lib/supabase/database.types";

/** A SIM counts as "online" while its gateway has reported in within this window. */
export const ONLINE_WINDOW_SECONDS = 180;

export interface SimSourceView {
  id: string;
  label: string;
  msisdn: string;
  isActive: boolean;
  online: boolean;
  lastSeenAt: string | null;
  /** null = not known yet (the gateway reads it from myMTN on the SIM's next order). */
  bundleRemainingMb: number | null;
  /** When the gateway last read it; null when typed by an admin. */
  bundleCheckedAt: string | null;
  dailyLimitMb: number;
  usedTodayMb: number;
  transfersThisMonth: number;
  freeTransfersPerMonth: number;
  lastUsedAt: string | null;
  notes: string | null;
  /** The latest myMTN login from the admin page: in progress, or finished in the last 15 minutes. */
  login: SimLoginView | null;
}

export interface SimLoginView {
  id: string;
  status: SimLoginStatus;
  message: string | null;
  updatedAt: string;
}

export const OPEN_LOGIN_STATUSES: SimLoginStatus[] = ["requested", "working", "needs_code", "code_sent"];
const SHOW_FINISHED_LOGIN_MS = 15 * 60 * 1000;

export interface SimJobView {
  id: string;
  purchaseId: string;
  reference: string;
  sourceLabel: string;
  recipient: string;
  amountMb: number;
  attempt: number;
  status: FulfillmentJobStatus;
  message: string | null;
  createdAt: string;
}

export interface SimPoolSummary {
  total: number;
  online: number;
  activeOnline: number;
  capacityTodayMb: number;
  queued: number;
  needsReview: number;
}

/** Nigeria's "today" — MTN's daily gifting cap resets on the local day, not UTC. */
function lagosDay(now: Date) {
  return now.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

/**
 * The pool tables are service-role only, so the admin check has to happen here rather than
 * being left to the database. Usage counters roll over lazily (a stale day reads as 0), the
 * same rule the allocation function applies.
 */
export async function getSimPool(): Promise<{ sources: SimSourceView[]; jobs: SimJobView[]; summary: SimPoolSummary }> {
  await getCurrentAdmin();
  const admin = createAdminClient();
  const now = new Date();
  const today = lagosDay(now);
  const month = today.slice(0, 7);

  await admin.rpc("fn_sim_login_expire");
  const [{ data: sources, error }, { data: jobs }, { data: logins }] = await Promise.all([
    admin.from("data_sources").select("*").order("label"),
    admin.from("fulfillment_jobs").select("*").order("created_at", { ascending: false }).limit(60),
    admin.from("sim_logins").select("id, source_id, status, message, updated_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const loginBySource = new Map<string, SimLoginView>();
  for (const l of logins ?? []) {
    if (loginBySource.has(l.source_id)) continue;
    const open = OPEN_LOGIN_STATUSES.includes(l.status);
    if (!open && now.getTime() - new Date(l.updated_at).getTime() > SHOW_FINISHED_LOGIN_MS) continue;
    loginBySource.set(l.source_id, { id: l.id, status: l.status, message: l.message, updatedAt: l.updated_at });
  }
  if (error) throw new Error(`Failed to load SIM pool: ${error.message}`);

  const views: SimSourceView[] = (sources ?? []).map((s) => {
    const online = !!s.last_seen_at && now.getTime() - new Date(s.last_seen_at).getTime() < ONLINE_WINDOW_SECONDS * 1000;
    return {
      id: s.id,
      label: s.label,
      msisdn: s.msisdn,
      isActive: s.is_active,
      online,
      lastSeenAt: s.last_seen_at,
      bundleRemainingMb: s.bundle_remaining_mb,
      bundleCheckedAt: s.bundle_checked_at,
      dailyLimitMb: s.daily_limit_mb,
      usedTodayMb: s.usage_day === today ? s.transferred_today_mb : 0,
      transfersThisMonth: s.usage_month === month ? s.transfers_this_month : 0,
      freeTransfersPerMonth: s.free_transfers_per_month,
      lastUsedAt: s.last_used_at,
      notes: s.notes,
      login: loginBySource.get(s.id) ?? null,
    };
  });

  const labelById = new Map(views.map((v) => [v.id, v.label]));
  const purchaseIds = [...new Set((jobs ?? []).map((j) => j.purchase_id))];
  const refById = new Map<string, string>();
  if (purchaseIds.length) {
    const { data: purchases } = await admin.from("purchases").select("id, reference").in("id", purchaseIds);
    for (const p of purchases ?? []) refById.set(p.id, p.reference);
  }

  const jobViews: SimJobView[] = (jobs ?? []).map((j) => ({
    id: j.id,
    purchaseId: j.purchase_id,
    reference: refById.get(j.purchase_id) ?? "—",
    sourceLabel: labelById.get(j.source_id) ?? "—",
    recipient: j.recipient_msisdn,
    amountMb: j.amount_mb,
    attempt: j.attempt,
    status: j.status,
    message: j.result_message,
    createdAt: j.created_at,
  }));

  // A SIM that has used its free transfers for the month takes no orders until the 1st.
  const usable = views.filter((v) => v.isActive && v.online && v.transfersThisMonth < v.freeTransfersPerMonth);
  return {
    sources: views,
    jobs: jobViews,
    summary: {
      total: views.length,
      online: views.filter((v) => v.online).length,
      activeOnline: usable.length,
      capacityTodayMb: usable.reduce(
        (sum, v) => sum + Math.max(0, Math.min(v.dailyLimitMb - v.usedTodayMb, v.bundleRemainingMb ?? Infinity)),
        0,
      ),
      queued: jobViews.filter((j) => j.status === "queued" || j.status === "claimed").length,
      needsReview: jobViews.filter((j) => j.status === "unknown").length,
    },
  };
}
