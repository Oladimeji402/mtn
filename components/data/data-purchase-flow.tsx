"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft, CircleCheckBig, Clock, Database, Loader2, Smartphone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataPlanGrid } from "@/components/data/data-plan-grid";
import { InsufficientBalance } from "@/components/shared/insufficient-balance";
import { PhoneFavorites } from "@/components/shared/phone-favorites";
import { PurchaseConfirmSheet } from "@/components/shared/purchase-confirm-sheet";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { isMtnNumber } from "@/lib/validation";
import { formatNaira, formatPhoneNumber } from "@/lib/format";
import { purchaseDataAction } from "@/lib/actions/purchase";
import { PURCHASE_FAILED_MESSAGE } from "@/lib/customer-messages";
import { GENERIC_ERROR_MESSAGE, errorText } from "@/lib/errors";
import { cn, screenPadClass, screenPanelClass } from "@/lib/utils";
import type { DataPlan, Transaction } from "@/types";

type Step = "form" | "confirm" | "processing" | "success" | "pending" | "failed";

export function DataPurchaseFlow({
  plans,
  walletBalance,
}: {
  plans: DataPlan[];
  walletBalance: number;
}) {
  const isDesktop = useIsDesktop();
  const [step, setStep] = React.useState<Step>("form");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<DataPlan | null>(null);
  const [result, setResult] = React.useState<Transaction | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  // One key per purchase attempt: a repeat of the same attempt (double tap, retry after a network
  // blip) returns the original purchase instead of charging the wallet again.
  const attempt = React.useRef<{ key: string; signature: string } | null>(null);

  function handleContinue() {
    const digits = phoneNumber.replace(/\s/g, "");
    if (!/^0\d{10}$/.test(digits)) {
      setPhoneError("Enter a valid 11-digit Nigerian phone number");
      return;
    }
    if (!isMtnNumber(digits)) {
      setPhoneError("This does not look like an MTN number");
      return;
    }
    if (!plan) return;
    setPhoneError(null);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!plan) return;
    setStep("processing");
    setError(null);
    try {
      // Bound to this exact number and plan, so changing either starts a fresh attempt.
      const signature = `${phoneNumber}|${plan.id}`;
      if (attempt.current?.signature !== signature) attempt.current = { key: crypto.randomUUID(), signature };
      const response = await purchaseDataAction({ phoneNumber, dataPlanId: plan.id, idempotencyKey: attempt.current.key });
      if (!response.ok) {
        setError(errorText(response));
        setStep("confirm");
        return;
      }
      const res = response.data;
      attempt.current = null;
      setResult(res);
      if (res.status === "successful") {
        setStep("success");
      } else if (res.status === "processing") {
        setStep("pending");
      } else {
        setStep("failed");
        toast.error(PURCHASE_FAILED_MESSAGE);
      }
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      setStep("confirm");
    }
  }

  function reset() {
    attempt.current = null;
    setStep("form");
    setPhoneNumber("");
    setPlan(null);
    setResult(null);
    setError(null);
  }

  if (step === "processing") {
    return (
      <div className={cn(screenPanelClass, "flex flex-col items-center justify-center gap-3 py-16 text-center")}>
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Buying data</p>
        </div>
      </div>
    );
  }

  if (step === "success" && result) {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
          <CircleCheckBig className="size-6 text-success" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Data sent</p>
          <p className="text-sm text-muted-foreground">
            {result.dataPlan?.size} to {formatPhoneNumber(result.phoneNumber)}
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href={`/dashboard/transactions/${result.id}`}>View receipt</Link>
          </Button>
          <Button variant="outline" size="lg" onClick={reset}>
            Buy again
          </Button>
        </div>
      </div>
    );
  }

  if (step === "pending" && result) {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10">
          <Clock className="size-6 text-warning" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Data is on its way</p>
          <p className="text-sm text-muted-foreground">
            {result.dataPlan?.size} to {formatPhoneNumber(result.phoneNumber)} is still being delivered.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href={`/dashboard/transactions/${result.id}`}>Check status</Link>
          </Button>
          <Button variant="outline" size="lg" onClick={reset}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  if (step === "failed" && result) {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Couldn&apos;t buy data</p>
          <p className="text-sm text-muted-foreground">{PURCHASE_FAILED_MESSAGE}</p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={reset}>Try again</Button>
        </div>
      </div>
    );
  }

  // From sm up the confirm step stays an in-page step, as it has always been.
  if (isDesktop && step === "confirm" && plan) {
    if (plan.price > walletBalance) {
      return (
        <InsufficientBalance
          balance={walletBalance}
          amount={plan.price}
          onCancel={() => setStep("form")}
        />
      );
    }

    return (
      <div className={cn("space-y-5", screenPanelClass)}>
        <button
          onClick={() => setStep("form")}
          className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Edit details
        </button>

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-3">
          <Row label="To" value={formatPhoneNumber(phoneNumber)} />
          <Row label="Plan" value={`${plan.size} · ${plan.validityLabel}`} />
          <Row label="Amount" value={formatNaira(plan.price)} />
        </div>

        <Button className="w-full" size="lg" onClick={handleConfirm}>
          Pay {formatNaira(plan.price)}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <section className={cn("space-y-3", screenPanelClass)}>
          <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-base font-semibold">
            <Smartphone className="size-4 text-muted-foreground" />
            Enter Phone Number
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            placeholder="e.g. 08012345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            aria-invalid={!!phoneError}
            className="h-12 text-base"
          />
          {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
          <PhoneFavorites phoneNumber={phoneNumber} onSelect={setPhoneNumber} />
        </section>

        <section className={cn("space-y-3", screenPanelClass)}>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Database className="size-4 text-muted-foreground" />
            Select Data Plan
          </h2>
          <DataPlanGrid plans={plans} selectedId={plan?.id ?? null} onSelect={setPlan} />
        </section>

        <div className={screenPadClass}>
          <Button className="w-full" size="lg" onClick={handleContinue} disabled={!plan}>
            {plan ? `Purchase ${plan.size} · ${formatNaira(plan.price, false)}` : "Select a data plan"}
          </Button>
        </div>

        <p className={cn("text-center text-xs text-muted-foreground", screenPadClass)}>
          Check your balance by dialing *323*4#
          <br />
          Data shows as &quot;Data Transfer&quot; or &quot;Bonus&quot; on the USSD screen, not in SMS
        </p>
      </div>

      {!isDesktop && plan ? (
        <PurchaseConfirmSheet
          open={step === "confirm"}
          onOpenChange={(open) => {
            if (!open) setStep("form");
          }}
          title="Confirm data purchase"
          amount={plan.price}
          walletBalance={walletBalance}
          rows={[
            { label: "Data plan", value: `${plan.size} · ${plan.validityLabel}` },
            { label: "Recipient", value: formatPhoneNumber(phoneNumber) },
            { label: "Amount", value: formatNaira(plan.price) },
          ]}
          actionLabel={`Pay ${formatNaira(plan.price)}`}
          onConfirm={handleConfirm}
        >
          {error ? (
            <div className="mt-5 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </PurchaseConfirmSheet>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
