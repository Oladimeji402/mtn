"use client";

import * as React from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowLeft, CircleCheckBig, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickAmountPicker } from "@/components/shared/amount-picker";
import { InsufficientBalance } from "@/components/shared/insufficient-balance";
import { PhoneFavorites } from "@/components/shared/phone-favorites";
import { PurchaseConfirmSheet } from "@/components/shared/purchase-confirm-sheet";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import { MAX_AIRTIME_AMOUNT, MIN_AIRTIME_AMOUNT, QUICK_AIRTIME_AMOUNTS } from "@/lib/constants";
import { formatNaira, formatPhoneNumber } from "@/lib/format";
import { buyAirtimeSchema, type BuyAirtimeValues } from "@/lib/validation";
import { purchaseAirtimeAction } from "@/lib/actions/purchase";
import { cn, screenPanelClass } from "@/lib/utils";
import type { Transaction } from "@/types";

type Step = "form" | "confirm" | "processing" | "success" | "pending" | "failed";

export function AirtimePurchaseFlow({ walletBalance }: { walletBalance: number }) {
  const isDesktop = useIsDesktop();
  const [step, setStep] = React.useState<Step>("form");
  const [values, setValues] = React.useState<BuyAirtimeValues | null>(null);
  const [result, setResult] = React.useState<Transaction | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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
    setError(null);
    try {
      const res = await purchaseAirtimeAction({
        phoneNumber: values.phoneNumber,
        amount: values.amount,
      });
      setResult(res);
      if (res.status === "successful") {
        setStep("success");
      } else if (res.status === "processing") {
        setStep("pending");
      } else {
        setStep("failed");
        toast.error(res.failureReason ?? "Purchase failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start purchase");
      setStep("confirm");
    }
  }

  function reset() {
    setStep("form");
    setValue("phoneNumber", "");
    setValue("amount", undefined as unknown as number);
    setValues(null);
    setResult(null);
    setError(null);
  }

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

  if (step === "pending" && result) {
    return (
      <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10">
          <Clock className="size-6 text-warning" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-medium">Airtime is on its way</p>
          <p className="text-sm text-muted-foreground">
            {formatNaira(result.amount)} to {formatPhoneNumber(result.phoneNumber)} is still being delivered.
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
          <p className="text-lg font-medium">Couldn&apos;t send airtime</p>
          <p className="text-sm text-muted-foreground">Your wallet was refunded.</p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
          <Button size="lg" onClick={reset}>Try again</Button>
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

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="space-y-3">
          <Row label="To" value={formatPhoneNumber(values.phoneNumber)} />
          <Row label="Amount" value={formatNaira(values.amount)} />
        </div>

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
