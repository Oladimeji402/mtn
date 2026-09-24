"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Plus, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/empty-state";
import { AdminResolveOrder } from "@/components/admin/admin-resolve-order";
import { deleteSimAction, saveSimAction } from "@/lib/actions/sim-pool";
import { GENERIC_ERROR_MESSAGE, errorText } from "@/lib/errors";
import { formatDateTime, formatPhoneNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SimJobView, SimPoolSummary, SimSourceView } from "@/lib/services/sim-pool";

const gb = (mb: number) => `${(mb / 1000).toFixed(mb % 1000 === 0 ? 0 : 1)}GB`;

const jobStyle: Record<SimJobView["status"], string> = {
  queued: "bg-secondary text-foreground",
  claimed: "bg-info/10 text-info",
  succeeded: "bg-success/10 text-success",
  failed: "bg-destructive/10 text-destructive",
  unknown: "bg-warning/10 text-warning",
  cancelled: "bg-secondary text-muted-foreground",
};

interface FormState {
  id?: string;
  label: string;
  msisdn: string;
  dataLeftGb: string;
  dailyLimitGb: string;
  transport: "gateway" | "api";
  isActive: boolean;
  notes: string;
}

const emptyForm: FormState = { label: "", msisdn: "", dataLeftGb: "", dailyLimitGb: "5", transport: "gateway", isActive: true, notes: "" };

export function AdminSimPool({
  sources,
  jobs,
  summary,
}: {
  sources: SimSourceView[];
  jobs: SimJobView[];
  summary: SimPoolSummary;
}) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [saving, setSaving] = React.useState(false);

  function edit(s: SimSourceView) {
    setForm({
      id: s.id,
      label: s.label,
      msisdn: s.msisdn,
      dataLeftGb: String(s.bundleRemainingMb / 1000),
      dailyLimitGb: String(s.dailyLimitMb / 1000),
      transport: s.transport,
      isActive: s.isActive,
      notes: s.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(next: FormState) {
    setSaving(true);
    try {
      const res = await saveSimAction({
        id: next.id,
        label: next.label,
        msisdn: next.msisdn.replace(/\s/g, ""),
        bundleRemainingMb: Math.round(Number(next.dataLeftGb || 0) * 1000),
        dailyLimitMb: Math.round(Number(next.dailyLimitGb || 5) * 1000),
        transport: next.transport,
        isActive: next.isActive,
        notes: next.notes,
      });
      if (!res.ok) {
        toast.error(errorText(res));
        return;
      }
      toast.success("SIM saved");
      setForm(null);
      router.refresh();
    } catch {
      toast.error(GENERIC_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: SimSourceView) {
    await save({
      id: s.id,
      label: s.label,
      msisdn: s.msisdn,
      dataLeftGb: String(s.bundleRemainingMb / 1000),
      dailyLimitGb: String(s.dailyLimitMb / 1000),
      transport: s.transport,
      isActive: !s.isActive,
      notes: s.notes ?? "",
    });
  }

  async function remove(s: SimSourceView) {
    if (!window.confirm(`Delete ${s.label}? This can't be undone.`)) return;
    const res = await deleteSimAction(s.id).catch(() => null);
    if (!res) return void toast.error(GENERIC_ERROR_MESSAGE);
    if (!res.ok) return void toast.error(errorText(res));
    toast.success("SIM deleted");
    router.refresh();
  }

  return (
    <div className="space-y-6 px-4 sm:px-0">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="SIMs ready" value={`${summary.activeOnline} / ${summary.total}`} hint="online and switched on" />
        <Stat label="Room left today" value={gb(summary.capacityTodayMb)} hint="across ready SIMs" />
        <Stat label="Orders in progress" value={String(summary.queued)} />
        <Stat label="Need your review" value={String(summary.needsReview)} alert={summary.needsReview > 0} />
      </div>

      {summary.total > 0 && summary.activeOnline === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            No SIM is online, so orders for SIM plans are being refused. Check that the gateway is running and can
            reach the internet.
          </span>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">SIMs</h2>
          {!form ? (
            <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
              <Plus className="size-4" />
              Add SIM
            </Button>
          ) : null}
        </div>

        {form ? (
          <form
            className="space-y-3 rounded-xl border bg-card p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save(form);
            }}
          >
            <p className="text-sm font-medium">{form.id ? "Edit SIM" : "Add a SIM"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" hint="e.g. SIM 1">
                <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </Field>
              <Field label="Phone number" hint="The SIM's own MTN number">
                <Input
                  value={form.msisdn}
                  onChange={(e) => setForm({ ...form, msisdn: e.target.value })}
                  inputMode="numeric"
                  placeholder="08031234567"
                  required
                />
              </Field>
              <Field label="How data is sent" hint="The gateway shares from this SIM's own myMTN login on the gateway phone">
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.transport}
                  onChange={(e) => setForm({ ...form, transport: e.target.value as "gateway" | "api" })}
                >
                  <option value="gateway">Gateway (myMTN app)</option>
                  <option value="api">MTN official API</option>
                </select>
              </Field>
              <Field label="Data left on the SIM (GB)" hint="Check with *323*4#. Update after you top it up.">
                <Input
                  value={form.dataLeftGb}
                  onChange={(e) => setForm({ ...form, dataLeftGb: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                  required
                />
              </Field>
              <Field label="Daily limit (GB)" hint="MTN's gifting cap is 5GB a day">
                <Input
                  value={form.dailyLimitGb}
                  onChange={(e) => setForm({ ...form, dailyLimitGb: e.target.value })}
                  inputMode="decimal"
                  required
                />
              </Field>
            </div>
            <Field label="Note (optional)">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={200} />
            </Field>
            <p className="text-xs text-muted-foreground">
              Only the phone number is stored. Never enter a SIM PIN or any password here.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {sources.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="No SIMs yet"
            description="Add the SIMs that will supply data. Orders for SIM plans only work once at least one is online."
          />
        ) : (
          <ul className="space-y-3">
            {sources.map((s) => (
              <li key={s.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">{formatPhoneNumber(s.msisdn)}</span>
                  <Badge tone={s.online ? "good" : "muted"}>{s.transport === "api" ? "MTN API" : s.online ? "Online" : "Offline"}</Badge>
                  {!s.isActive ? <Badge tone="warn">Switched off</Badge> : null}
                  {s.isActive && s.transfersThisMonth >= s.freeTransfersPerMonth ? (
                    <Badge tone="warn">Free transfers used · resumes on the 1st</Badge>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                  <Item label="Data left" value={gb(s.bundleRemainingMb)} />
                  <Item label="Sent today" value={`${gb(s.usedTodayMb)} of ${gb(s.dailyLimitMb)}`} />
                  <Item label="This month" value={`${s.transfersThisMonth} of ${s.freeTransfersPerMonth} free`} />
                  <Item label="Last used" value={s.lastUsedAt ? formatDateTime(s.lastUsedAt) : "Never"} />
                </dl>
                {s.notes ? <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => edit(s)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(s)} disabled={saving}>
                    {s.isActive ? "Switch off" : "Switch on"}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(s)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recent transfers</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Transfers appear here as customers buy SIM plans.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {jobs.map((j) => (
              <li key={j.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", jobStyle[j.status])}>
                    {j.status === "unknown" ? "Needs review" : j.status}
                  </span>
                  <span className="font-medium">{gb(j.amountMb)}</span>
                  <span className="text-muted-foreground">from {j.sourceLabel} to {formatPhoneNumber(j.recipient)}</span>
                  {j.attempt > 1 ? <span className="text-xs text-muted-foreground">(attempt {j.attempt})</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                  <span>{formatDateTime(j.createdAt)}</span>
                  <Link href={`/admin/transactions/${j.purchaseId}`} className="font-mono underline-offset-2 hover:underline">
                    {j.reference}
                  </Link>
                  {j.message ? <span>{j.message}</span> : null}
                </div>
                {j.status === "unknown" ? <AdminResolveOrder purchaseId={j.purchaseId} size="sm" /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", alert && "border-warning/50 bg-warning/5")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Badge({ tone, children }: { tone: "good" | "muted" | "warn"; children: React.ReactNode }) {
  const styles = { good: "bg-success/10 text-success", muted: "bg-secondary text-muted-foreground", warn: "bg-warning/10 text-warning" };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[tone])}>{children}</span>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
