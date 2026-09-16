"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheckBig, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataPlanGrid } from "@/components/data/data-plan-grid";
import { InsufficientBalance } from "@/components/shared/insufficient-balance";
import { PurchaseConfirmSheet } from "@/components/shared/purchase-confirm-sheet";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { isMtnNumber } from "@/lib/validation";
import { formatNaira, formatPhoneNumber } from "@/lib/format";
import { submitDataPurchase } from "@/lib/services/purchase";
import { cn, screenPanelClass } from "@/lib/utils";
import type { DataPlan, Transaction } from "@/types";

type Step = "form" | "confirm" | "processing" | "success" | "failed";
type Outcome = "success" | "failed";

export function DataPurchaseFlow({
  plans,
  walletBalance,
}: {
  plans: DataPlan[];
  walletBalance: number;
}) {
  const isDesktop = useIsDesktop();
  const [step, setStep] = React.useState<Step>("form");
  const [outcome, setOutcome] = React.useState<Outcome>("success");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [plan, setPlan] = React.useState<DataPlan | null>(null);
  const [result, setResult] = React.useState<Transaction | null>(null);

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
    if (outcome === "success") {
      const res = await submitDataPurchase({
        phoneNumber,
        dataPlanId: plan.id,
        walletBalanceBefore: walletBalance,
      });
      setResult(res);
      setStep("success");
    } else {
      await new Promise((r) => setTimeout(r, 1500));
      setStep("failed");
    }
  }

  function reset() {
    setStep("form");
    setPhoneNumber("");
    setPlan(null);
    setResult(null);
    setOutcome("success");
  }

  // Rendered into whichever confirm container the breakpoint selects — never both.
  const outcomeField = (
    <div className="space-y-1.5 rounded-lg border border-dashed p-3">
      <Label htmlFor="outcome" className="text-xs text-muted-foreground">
        Preview result (demo only)
      </Label>
      <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
        <SelectTrigger id="outcome" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="success">Successful</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

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

  if (step === "failed") {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Couldn&apos;t buy data</p>
          <p className="text-sm text-muted-foreground">Nothing was charged.</p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => setStep("confirm")}>Try again</Button>
          <Button variant="outline" size="lg" onClick={reset}>
            Cancel
          </Button>
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

        <div className="space-y-3">
          <Row label="To" value={formatPhoneNumber(phoneNumber)} />
          <Row label="Plan" value={`${plan.size} · ${plan.validityLabel}`} />
          <Row label="Amount" value={formatNaira(plan.price)} />
        </div>

        {outcomeField}

        <Button className="w-full" size="lg" onClick={handleConfirm}>
          Pay {formatNaira(plan.price)}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-5", screenPanelClass)}>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">MTN phone number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            placeholder="080X XXX XXXX"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            aria-invalid={!!phoneError}
          />
          {phoneError ? <p className="text-xs text-destructive">{phoneError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label>Data plan</Label>
          <DataPlanGrid plans={plans} selectedId={plan?.id ?? null} onSelect={setPlan} />
        </div>

        <Button className="w-full" size="lg" onClick={handleContinue} disabled={!plan}>
          Continue
        </Button>
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
          <div className="mt-5">{outcomeField}</div>
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
