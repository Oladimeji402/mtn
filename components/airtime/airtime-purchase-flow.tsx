"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { QuickAmountPicker } from "@/components/shared/amount-picker";
import { InsufficientBalance } from "@/components/shared/insufficient-balance";
import { PhoneFavorites } from "@/components/shared/phone-favorites";
import { PurchaseConfirmSheet } from "@/components/shared/purchase-confirm-sheet";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { MAX_AIRTIME_AMOUNT, MIN_AIRTIME_AMOUNT, QUICK_AIRTIME_AMOUNTS } from "@/lib/constants";
import { formatNaira, formatPhoneNumber } from "@/lib/format";
import { buyAirtimeSchema, type BuyAirtimeValues } from "@/lib/validation";
import { submitAirtimePurchase } from "@/lib/services/purchase";
import { cn, screenPanelClass } from "@/lib/utils";
import type { Transaction } from "@/types";

type Step = "form" | "confirm" | "processing" | "success" | "failed";
type Outcome = "success" | "failed";

export function AirtimePurchaseFlow({ walletBalance }: { walletBalance: number }) {
  const isDesktop = useIsDesktop();
  const [step, setStep] = React.useState<Step>("form");
  const [outcome, setOutcome] = React.useState<Outcome>("success");
  const [values, setValues] = React.useState<BuyAirtimeValues | null>(null);
  const [result, setResult] = React.useState<Transaction | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BuyAirtimeValues>({
    resolver: zodResolver(buyAirtimeSchema),
    defaultValues: { phoneNumber: "", amount: undefined },
  });

  const watchedAmount = watch("amount");
  const watchedPhone = watch("phoneNumber");

  function onSubmitForm(v: BuyAirtimeValues) {
    setValues(v);
    setStep("confirm");
  }

  async function handleConfirm() {
    if (!values) return;
    setStep("processing");
    if (outcome === "success") {
      const res = await submitAirtimePurchase({
        phoneNumber: values.phoneNumber,
        amount: values.amount,
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
    setValue("phoneNumber", "");
    setValue("amount", undefined as unknown as number);
    setValues(null);
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
          <p className="font-medium">Sending airtime</p>
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
          <p className="text-lg font-medium">Airtime sent</p>
          <p className="text-sm text-muted-foreground">
            {formatNaira(result.amount)} to {formatPhoneNumber(result.phoneNumber)}
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

  if (step === "failed" && values) {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Couldn&apos;t send airtime</p>
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
  if (isDesktop && step === "confirm" && values) {
    if (values.amount > walletBalance) {
      return (
        <InsufficientBalance
          balance={walletBalance}
          amount={values.amount}
          onCancel={() => setStep("form")}
        />
      );
    }

    return (
      <div className={cn(screenPanelClass, "space-y-5")}>
        <button
          onClick={() => setStep("form")}
          className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Edit details
        </button>

        <div className="space-y-3">
          <Row label="To" value={formatPhoneNumber(values.phoneNumber)} />
          <Row label="Amount" value={formatNaira(values.amount)} />
        </div>

        {outcomeField}

        <Button className="w-full" size="lg" onClick={handleConfirm}>
          Send {formatNaira(values.amount)}
        </Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmitForm)} className={cn("space-y-5", screenPanelClass)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="phoneNumber">MTN phone number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            placeholder="080X XXX XXXX"
            aria-invalid={!!errors.phoneNumber}
            aria-describedby={errors.phoneNumber ? "phone-error" : undefined}
            {...register("phoneNumber")}
          />
          {errors.phoneNumber ? (
            <p id="phone-error" className="text-xs text-destructive">
              {errors.phoneNumber.message}
            </p>
          ) : null}
          <PhoneFavorites
            phoneNumber={watchedPhone ?? ""}
            onSelect={(v) => setValue("phoneNumber", v, { shouldValidate: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Quick amounts</Label>
          <QuickAmountPicker
            amounts={QUICK_AIRTIME_AMOUNTS}
            selected={watchedAmount ?? null}
            onSelect={(v) => setValue("amount", v, { shouldValidate: true })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
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
              Between {formatNaira(MIN_AIRTIME_AMOUNT, false)} and{" "}
              {formatNaira(MAX_AIRTIME_AMOUNT, false)}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg">
          Continue
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Check your airtime balance by dialing *310#
        </p>
      </form>

      {!isDesktop && values ? (
        <PurchaseConfirmSheet
          open={step === "confirm"}
          onOpenChange={(open) => {
            if (!open) setStep("form");
          }}
          title="Confirm airtime purchase"
          amount={values.amount}
          walletBalance={walletBalance}
          rows={[
            { label: "Product", value: "Airtime" },
            { label: "Recipient", value: formatPhoneNumber(values.phoneNumber) },
            { label: "Amount", value: formatNaira(values.amount) },
          ]}
          actionLabel={`Pay ${formatNaira(values.amount)}`}
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
