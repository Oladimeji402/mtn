"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleAlert, Loader2, LogIn, MoreHorizontal, Plus, RadioTower } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AdminResolveOrder } from "@/components/admin/admin-resolve-order";
import { deleteSimAction, saveSimAction } from "@/lib/actions/sim-pool";
import { cancelSimLoginAction, startSimLoginAction, submitSimLoginCodeAction } from "@/lib/actions/sim-login";
import { GENERIC_ERROR_MESSAGE, errorText, type ActionResult } from "@/lib/errors";
import { formatDateTime, formatPhoneNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SimLoginStatus } from "@/lib/supabase/database.types";
import type { SimJobView, SimPoolSummary, SimSourceView } from "@/lib/services/sim-pool";

const gb = (mb: number) => `${(mb / 1000).toFixed(mb % 1000 === 0 ? 0 : 1)}GB`;
const OPEN_LOGIN: SimLoginStatus[] = ["requested", "working", "needs_code", "code_sent"];
const REFRESH_MS = 5000;

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
  /** What the field held when the form opened: an untouched figure is left alone on save. */
  dataLeftGbWas: string;
  dailyLimitGb: string;
  isActive: boolean;
  notes: string;
}

const emptyForm: FormState = { label: "", msisdn: "", dataLeftGb: "", dataLeftGbWas: "", dailyLimitGb: "5", isActive: true, notes: "" };
const dataLeftText = (mb: number | null) => (mb === null ? "" : String(mb / 1000));

const formFrom = (s: SimSourceView, patch: Partial<FormState> = {}): FormState => ({
  id: s.id,
  label: s.label,
  msisdn: s.msisdn,
  dataLeftGb: dataLeftText(s.bundleRemainingMb),
  dataLeftGbWas: dataLeftText(s.bundleRemainingMb),
  dailyLimitGb: String(s.dailyLimitMb / 1000),
  isActive: s.isActive,
  notes: s.notes ?? "",
  ...patch,
});

/** Runs a server action with the usual toasts. Returns whether it worked. */
async function run<T>(action: () => Promise<ActionResult<T>>, success?: string): Promise<boolean> {
  try {
    const res = await action();
    if (!res.ok) {
      toast.error(errorText(res));
      return false;
    }
    if (success) toast.success(success);
    return true;
  } catch {
    toast.error(GENERIC_ERROR_MESSAGE);
    return false;
  }
}

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
  const [deleting, setDeleting] = React.useState<SimSourceView | null>(null);

  // Keep the page live while something is moving: a login waiting on the gateway or an order.
  const busy = summary.queued > 0 || sources.some((s) => s.login && OPEN_LOGIN.includes(s.login.status));
  React.useEffect(() => {
    if (!busy) return;
    // Only while the tab is on screen: every refresh is a full round trip, auth check included.
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [busy, router]);

  async function save(next: FormState) {
    setSaving(true);
    const ok = await run(
      () =>
        saveSimAction({
          id: next.id,
          label: next.label,
          msisdn: next.msisdn.replace(/\s/g, ""),
          bundleRemainingMb:
            next.id && next.dataLeftGb.trim() === next.dataLeftGbWas
              ? undefined
              : next.dataLeftGb.trim() === ""
                ? null
                : Math.round(Number(next.dataLeftGb) * 1000),
          dailyLimitMb: Math.round(Number(next.dailyLimitGb || 5) * 1000),
          isActive: next.isActive,
          notes: next.notes,
        }),
      "SIM saved",
    );
    setSaving(false);
    if (ok) {
      setForm(null);
      router.refresh();
    }
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    const ok = await run(() => deleteSimAction(deleting.id), "SIM deleted");
    setSaving(false);
    setDeleting(null);
    if (ok) router.refresh();
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
            No SIM is ready, so orders for SIM plans are being refused. Check that the gateway is running, and log in
            any SIM that shows Offline.
          </span>
        </div>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">SIMs</h2>
          <Button size="sm" onClick={() => setForm({ ...emptyForm })}>
            <Plus />
            Add SIM
          </Button>
        </div>

        {sources.length === 0 ? (
          <EmptyState
            icon={RadioTower}
            title="No SIMs yet"
            description="Add the SIMs that will supply data, then log each one in to myMTN on the gateway."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {sources.map((s) => (
              <SimCard
                key={s.id}
                sim={s}
                disabled={saving}
                onEdit={() => setForm(formFrom(s))}
                onToggle={() => save(formFrom(s, { isActive: !s.isActive }))}
                onDelete={() => setDeleting(s)}
              />
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
                  <span className="text-muted-foreground">
                    from {j.sourceLabel} to {formatPhoneNumber(j.recipient)}
                  </span>
                  {j.attempt > 1 ? <span className="text-xs text-muted-foreground">(attempt {j.attempt})</span> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{formatDateTime(j.createdAt)}</span>
                  <Link href={`/admin/transactions/${j.purchaseId}`} className="font-mono underline-offset-2 hover:underline">
                    {j.reference}
                  </Link>
                  {j.message ? <span className="break-words">{j.message}</span> : null}
                </div>
                {j.status === "unknown" ? <AdminResolveOrder purchaseId={j.purchaseId} size="sm" /> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <SimFormDialog form={form} setForm={setForm} saving={saving} onSave={save} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.label ?? "this SIM"}?`}
        description="This can't be undone. A SIM with order history can't be deleted; switch it off instead."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={remove}
      />
    </div>
  );
}

// ---- one SIM ------------------------------------------------------------------------------

function SimCard({
  sim: s,
  disabled,
  onEdit,
  onToggle,
  onDelete,
}: {
  sim: SimSourceView;
  disabled: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const monthUsed = s.isActive && s.transfersThisMonth >= s.freeTransfersPerMonth;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold">{s.label}</p>
          <p className="font-mono text-xs text-muted-foreground">{formatPhoneNumber(s.msisdn)}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Pill tone={s.online ? "good" : "muted"}>{s.online ? "Online" : "Offline"}</Pill>
            {!s.isActive ? <Pill tone="warn">Switched off</Pill> : null}
            {monthUsed ? <Pill tone="warn">Free shares used · back on the 1st</Pill> : null}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${s.label}`} disabled={disabled}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onSelect={onToggle}>{s.isActive ? "Switch off" : "Switch on"}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        <Item
          label="Data left"
          value={s.bundleRemainingMb === null ? "Not read yet" : gb(s.bundleRemainingMb)}
          hint={
            s.bundleRemainingMb === null
              ? "read on the next order"
              : s.bundleCheckedAt
                ? `read ${formatRelativeTime(s.bundleCheckedAt)}`
                : "typed by an admin"
          }
        />
        <Item label="Sent today" value={`${gb(s.usedTodayMb)} of ${gb(s.dailyLimitMb)}`} />
        <Item label="This month" value={`${s.transfersThisMonth} of ${s.freeTransfersPerMonth} free`} />
        <Item label="Last used" value={s.lastUsedAt ? formatDateTime(s.lastUsedAt) : "Never"} />
      </dl>
      {s.notes ? <p className="text-xs text-muted-foreground">{s.notes}</p> : null}

      <SimLogin sim={s} />
    </li>
  );
}

// ---- logging a SIM in to myMTN from here --------------------------------------------------

function SimLogin({ sim: s }: { sim: SimSourceView }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [code, setCode] = React.useState("");
  const login = s.login;
  const open = !!login && OPEN_LOGIN.includes(login.status);

  async function act<T>(action: () => Promise<ActionResult<T>>, success?: string) {
    setPending(true);
    const ok = await run(action, success);
    setPending(false);
    if (ok) router.refresh();
    return ok;
  }

  if (!open) {
    return (
      <div className="mt-auto space-y-2 border-t pt-3">
        {login?.status === "succeeded" ? (
          <p className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> Logged in to myMTN
          </p>
        ) : login ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Login {login.status === "cancelled" ? "cancelled" : "didn't finish"}.</span>{" "}
            {login.message}
          </p>
        ) : null}
        <Button
          variant={s.online ? "outline" : "default"}
          className="w-full sm:w-auto"
          disabled={pending}
          onClick={() => act(() => startSimLoginAction(s.id))}
        >
          {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
          {s.online ? "Log in again" : "Log in"}
        </Button>
      </div>
    );
  }

  const waiting: Partial<Record<SimLoginStatus, string>> = {
    requested: "Waiting for the gateway to pick this up…",
    working: "The gateway is working in myMTN…",
    code_sent: "Entering your code in myMTN…",
  };

  return (
    <div className="mt-auto space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <Steps status={login.status} />

      {login.status === "needs_code" ? (
        <form
          className="space-y-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await act(() => submitSimLoginCodeAction(login.id, code))) setCode("");
          }}
        >
          <Label htmlFor={`code-${login.id}`} className="block text-sm font-normal">
            MTN has sent a code by text message to <span className="font-medium">{formatPhoneNumber(s.msisdn)}</span>.
            Enter it here.
          </Label>
          {login.message ? <p className="text-sm text-destructive">{login.message}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`code-${login.id}`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code"
              className="h-11 text-center font-mono text-lg tracking-[0.3em] sm:max-w-44"
              autoFocus
              required
            />
            <Button type="submit" className="h-11 sm:px-6" disabled={pending || code.length < 4}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Submit code
            </Button>
          </div>
        </form>
      ) : (
        <p className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
          <span>
            {waiting[login.status]}
            {login.message ? <span className="block text-xs text-muted-foreground">{login.message}</span> : null}
          </span>
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={pending}
        onClick={() => act(() => cancelSimLoginAction(login.id), "Login cancelled")}
      >
        Cancel
      </Button>
    </div>
  );
}

function Steps({ status }: { status: SimLoginStatus }) {
  const current = status === "needs_code" ? 1 : status === "code_sent" ? 2 : 0;
  const steps = ["Open myMTN", "Enter code", "Logged in"];
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Login progress">
      {steps.map((label, i) => (
        <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={i === current ? "step" : undefined}>
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
              i < current && "border-primary bg-primary text-primary-foreground",
              i === current && "border-primary text-primary",
              i > current && "text-muted-foreground",
            )}
          >
            {i + 1}
          </span>
          <span className={cn("truncate", i === current ? "font-medium" : "text-muted-foreground")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

// ---- add / edit ---------------------------------------------------------------------------

function SimFormDialog({
  form,
  setForm,
  saving,
  onSave,
}: {
  form: FormState | null;
  setForm: (f: FormState | null) => void;
  saving: boolean;
  onSave: (f: FormState) => void;
}) {
  return (
    <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {form ? (
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              onSave(form);
            }}
          >
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit SIM" : "Add a SIM"}</DialogTitle>
              <DialogDescription>
                Only the phone number is stored. Never enter a SIM PIN or any password here.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="sim-label" label="Name" hint="e.g. SIM 1">
                <Input id="sim-label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
              </Field>
              <Field id="sim-number" label="Phone number" hint="The SIM's own MTN number">
                <Input
                  id="sim-number"
                  value={form.msisdn}
                  onChange={(e) => setForm({ ...form, msisdn: e.target.value })}
                  inputMode="numeric"
                  placeholder="08031234567"
                  required
                />
              </Field>
              <Field id="sim-data" label="Data left (GB, optional)" hint="Leave empty: the gateway reads it from myMTN on every order.">
                <Input
                  id="sim-data"
                  value={form.dataLeftGb}
                  onChange={(e) => setForm({ ...form, dataLeftGb: e.target.value })}
                  inputMode="decimal"
                  placeholder="Read automatically"
                />
              </Field>
              <Field id="sim-limit" label="Daily limit (GB)" hint="MTN allows 5GB of sharing a day">
                <Input
                  id="sim-limit"
                  value={form.dailyLimitGb}
                  onChange={(e) => setForm({ ...form, dailyLimitGb: e.target.value })}
                  inputMode="decimal"
                  required
                />
              </Field>
              <Field id="sim-notes" label="Note (optional)" className="sm:col-span-2">
                <Input id="sim-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={200} />
              </Field>
            </div>
            {!form.id ? (
              <p className="text-xs text-muted-foreground">
                After saving, press &ldquo;Log in&rdquo; on the SIM so the gateway can use it.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ---- small pieces ---------------------------------------------------------------------------

function Stat({ label, value, hint, alert }: { label: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", alert && "border-warning/50 bg-warning/5")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Item({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
      {hint ? <dd className="truncate text-xs text-muted-foreground">{hint}</dd> : null}
    </div>
  );
}

function Pill({ tone, children }: { tone: "good" | "muted" | "warn"; children: React.ReactNode }) {
  const styles = { good: "bg-success/10 text-success", muted: "bg-secondary text-muted-foreground", warn: "bg-warning/10 text-warning" };
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", styles[tone])}>{children}</span>;
}

function Field({ id, label, hint, className, children }: { id: string; label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
