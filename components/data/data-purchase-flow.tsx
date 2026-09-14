"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CircleCheckBig, Info, Loader2, XCircle } from "lucide-react";
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
import { CopyButton } from "@/components/shared/copy-button";
import { isMtnNumber } from "@/lib/validation";
import { formatNaira, formatPhoneNumber } from "@/lib/format";
import { submitDataPurchase } from "@/lib/services/purchase";
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

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Submitting your purchase</p>
          <p className="text-sm text-muted-foreground">Deducting from your wallet.</p>
        </div>
      </div>
    );
  }

  if (step === "success" && result) {
    return (
      <div className="space-y-4 rounded-xl border bg-card px-6 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
          <CircleCheckBig className="size-6 text-success" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Payment successful</p>
          <p className="text-sm text-muted-foreground">
            Your MTN data purchase is being processed.
          </p>
        </div>

        <div className="mx-auto max-w-xs space-y-2 rounded-lg border bg-secondary/40 p-4 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-medium">{result.dataPlan?.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Number</span>
            <span className="font-medium">{formatPhoneNumber(result.phoneNumber)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{formatNaira(result.amount)}</span>
          </div>
        </div>

        <div className="mx-auto flex w-fit items-center gap-2 rounded-lg bg-secondary px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">{result.reference}</span>
          <CopyButton value={result.reference} label="" className="h-5 w-5 p-0" />
        </div>

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href={`/dashboard/transactions/${result.id}`}>Track status</Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            Buy again
          </Button>
        </div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="space-y-4 rounded-xl border bg-card px-6 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Data purchase failed</p>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t complete this purchase. Your wallet was not charged.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button onClick={() => setStep("confirm")}>Try again</Button>
          <Button variant="outline" onClick={reset}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (step === "confirm" && plan) {
    if (plan.price > walletBalance) {
      return (
        <InsufficientBalance
          balance={walletBalance}
          amount={plan.price}
          onCancel={() => setStep("form")}
        />
      );
    }

    const balanceAfter = walletBalance - plan.price;
    return (
      <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Edit details
        </button>

        <div className="space-y-3 rounded-lg border p-4">
          <Row label="Network" value="MTN" />
          <Row label="Phone number" value={formatPhoneNumber(phoneNumber)} />
          <Row label="Data plan" value={`${plan.size} · ${plan.validityLabel}`} />
          <Row label="Amount" value={formatNaira(plan.price)} />
          <Row label="Wallet balance" value={formatNaira(walletBalance)} />
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Balance after purchase</span>
            <span className="font-semibold">{formatNaira(balanceAfter)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-info/5 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-info" />
          Your wallet is debited immediately. Delivery is confirmed by the network shortly after.
        </div>

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

        <Button className="w-full" size="lg" onClick={handleConfirm}>
          Confirm Purchase
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
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
        <Label>Select a data plan</Label>
        <DataPlanGrid plans={plans} selectedId={plan?.id ?? null} onSelect={setPlan} />
      </div>

      <Button className="w-full" size="lg" onClick={handleContinue} disabled={!plan}>
        Continue
      </Button>
    </div>
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
