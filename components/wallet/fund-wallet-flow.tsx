"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CircleCheckBig,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
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
import { QuickAmountPicker } from "@/components/shared/amount-picker";
import { MIN_FUNDING_AMOUNT, QUICK_FUND_AMOUNTS } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import { fundWalletSchema, type FundWalletValues } from "@/lib/validation";
import { submitWalletFunding } from "@/lib/services/purchase";

type Step = "form" | "confirm" | "processing" | "success" | "failed" | "delayed";
type Outcome = "success" | "failed" | "delayed";

export function FundWalletFlow({ currentBalance }: { currentBalance: number }) {
  const [step, setStep] = React.useState<Step>("form");
  const [outcome, setOutcome] = React.useState<Outcome>("success");
  const [newBalance, setNewBalance] = React.useState(currentBalance);
  const [amount, setAmount] = React.useState(0);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FundWalletValues>({
    resolver: zodResolver(fundWalletSchema),
    defaultValues: { amount: undefined },
  });

  const watchedAmount = watch("amount");

  function onSubmitForm(values: FundWalletValues) {
    setAmount(values.amount);
    setStep("confirm");
  }

  async function handleConfirm() {
    setStep("processing");
    if (outcome === "success") {
      const result = await submitWalletFunding({ amount, walletBalanceBefore: currentBalance });
      setNewBalance(result.balanceAfter);
      setStep("success");
    } else {
      await new Promise((r) => setTimeout(r, 1600));
      setStep(outcome);
    }
  }

  function reset() {
    setStep("form");
    setValue("amount", undefined as unknown as number);
    setAmount(0);
    setOutcome("success");
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Processing your payment</p>
          <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="space-y-4 rounded-xl border bg-card px-6 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
          <CircleCheckBig className="size-6 text-success" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Wallet funded successfully</p>
          <p className="text-sm text-muted-foreground">
            {formatNaira(amount)} has been added to your wallet.
          </p>
        </div>
        <div className="mx-auto w-fit rounded-lg bg-secondary px-4 py-2">
          <p className="text-xs text-muted-foreground">New balance</p>
          <p className="font-semibold">{formatNaira(newBalance)}</p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            Fund again
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
          <p className="text-lg font-medium">Payment failed</p>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t confirm your payment of {formatNaira(amount)}. Your wallet was not
            charged.
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

  if (step === "delayed") {
    return (
      <div className="space-y-4 rounded-xl border bg-card px-6 py-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10">
          <Clock className="size-6 text-warning" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Payment taking longer than usual</p>
          <p className="text-sm text-muted-foreground">
            We&apos;re still confirming your payment of {formatNaira(amount)}. We&apos;ll notify
            you and update your balance as soon as it clears.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/dashboard/wallet/history">View wallet history</Link>
          </Button>
          <Button variant="outline" onClick={reset}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (step === "confirm") {
    const expectedBalance = currentBalance + amount;
    return (
      <div className="space-y-5 rounded-xl border bg-card p-5 sm:p-6">
        <button
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Edit amount
        </button>

        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount to fund</span>
            <span className="font-medium">{formatNaira(amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current balance</span>
            <span className="font-medium">{formatNaira(currentBalance)}</span>
          </div>
          <div className="flex justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Expected balance</span>
            <span className="font-semibold">{formatNaira(expectedBalance)}</span>
          </div>
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
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="w-full" size="lg" onClick={handleConfirm}>
          Continue to Payment
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6" noValidate>
      <div className="space-y-2">
        <Label>Quick amounts</Label>
        <QuickAmountPicker
          amounts={QUICK_FUND_AMOUNTS}
          selected={watchedAmount ?? null}
          onSelect={(v) => setValue("amount", v, { shouldValidate: true })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Or enter a custom amount</Label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            ₦
          </span>
          <Input
            id="amount"
            type="number"
            inputMode="numeric"
            placeholder="0.00"
            className="pl-7"
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            {...register("amount")}
          />
        </div>
        {errors.amount ? (
          <p id="amount-error" className="text-xs text-destructive">
            {errors.amount.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Minimum funding amount is {formatNaira(MIN_FUNDING_AMOUNT, false)}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg">
        Continue
      </Button>
    </form>
  );
}
