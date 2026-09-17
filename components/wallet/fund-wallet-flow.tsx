"use client";

import * as React from "react";
import Link from "next/link";
import Script from "next/script";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowLeft, CircleCheckBig, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QuickAmountPicker } from "@/components/shared/amount-picker";
import { MIN_FUNDING_AMOUNT, QUICK_FUND_AMOUNTS } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import { fundWalletSchema, type FundWalletValues } from "@/lib/validation";
import { confirmWalletFundingAction, initiateWalletFundingAction } from "@/lib/actions/wallet";
import { cn, screenPanelClass } from "@/lib/utils";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        currency?: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

type Step = "form" | "confirm" | "processing" | "success" | "failed" | "delayed";

export function FundWalletFlow({ currentBalance }: { currentBalance: number }) {
  const [step, setStep] = React.useState<Step>("form");
  const [newBalance, setNewBalance] = React.useState(currentBalance);
  const [amount, setAmount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [scriptReady, setScriptReady] = React.useState(false);

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
    setError(null);
    setStep("confirm");
  }

  async function handlePay() {
    if (!window.PaystackPop) {
      setError("Payment is still loading.");
      return;
    }
    setError(null);
    setStep("processing");

    try {
      const intent = await initiateWalletFundingAction(amount);

      const handler = window.PaystackPop.setup({
        key: intent.publicKey,
        email: intent.email,
        amount: intent.amountKobo,
        ref: intent.reference,
        currency: "NGN",
        onClose: () => setStep("confirm"),
        // Paystack's Inline SDK validates that `callback` is a plain function — an
        // `async` function here fails that check (its constructor is AsyncFunction,
        // not Function), which is what threw "Attribute callback must be a valid
        // function". Keep the callback itself synchronous and run the async
        // confirm logic inside a fire-and-forget IIFE instead.
        callback: (response) => {
          void (async () => {
            try {
              const result = await confirmWalletFundingAction(response.reference);
              if (result.outcome === "successful") {
                setNewBalance(result.newBalance ?? currentBalance + amount);
                setStep("success");
                toast.success("Wallet funded");
              } else if (result.outcome === "pending") {
                setStep("delayed");
                toast.message("Confirming payment");
              } else {
                setError(result.reason ?? null);
                setStep("failed");
                toast.error(result.reason ?? "Payment failed");
              }
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not confirm payment.");
              setStep("failed");
            }
          })();
        },
      });
      handler.openIframe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start payment";
      setError(message);
      toast.error(message);
      setStep("confirm");
    }
  }

  function reset() {
    setStep("form");
    setValue("amount", undefined as unknown as number);
    setAmount(0);
    setError(null);
  }

  return (
    <>
      <Script
        src="https://js.paystack.co/v1/inline.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />

      {step === "processing" ? (
        <div className={cn(screenPanelClass, "flex flex-col items-center justify-center gap-3 py-16 text-center")}>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Opening payment</p>
          </div>
        </div>
      ) : step === "success" ? (
        <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheckBig className="size-6 text-success" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Wallet funded</p>
            <p className="text-sm text-muted-foreground">{formatNaira(amount)} added.</p>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">Done</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>
              Fund again
            </Button>
          </div>
        </div>
      ) : step === "failed" ? (
        <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="size-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Payment failed</p>
            <p className="text-sm text-muted-foreground">Nothing was charged.</p>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button size="lg" onClick={() => setStep("confirm")}>Try again</Button>
            <Button variant="outline" size="lg" onClick={reset}>
              Cancel
            </Button>
          </div>
        </div>
      ) : step === "delayed" ? (
        <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-warning/10">
            <Clock className="size-6 text-warning" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Payment pending</p>
            <p className="text-sm text-muted-foreground">
              {formatNaira(amount)} will show in your wallet shortly.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard/wallet/history">Wallet history</Link>
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>
              Back
            </Button>
          </div>
        </div>
      ) : step === "confirm" ? (
        <div className={cn("space-y-5", screenPanelClass)}>
          <button
            onClick={() => setStep("form")}
            className="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Edit amount
          </button>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">You&apos;re adding</p>
            <p className="text-3xl font-semibold tracking-tight">{formatNaira(amount)}</p>
          </div>

          <Button className="w-full" size="lg" onClick={handlePay} disabled={!scriptReady}>
            {!scriptReady ? <Loader2 className="size-4 animate-spin" /> : null}
            Pay {formatNaira(amount)}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmitForm)}
          className={cn("space-y-5", screenPanelClass)}
          noValidate
        >
          <div className="space-y-2">
            <Label>Quick amounts</Label>
            <QuickAmountPicker
              amounts={QUICK_FUND_AMOUNTS}
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
                Minimum {formatNaira(MIN_FUNDING_AMOUNT, false)}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg">
            Proceed to Payment
          </Button>
        </form>
      )}
    </>
  );
}
