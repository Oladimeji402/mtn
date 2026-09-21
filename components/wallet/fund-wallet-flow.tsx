"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, ArrowLeft, CircleCheckBig, Clock, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QuickAmountPicker } from "@/components/shared/amount-picker";
import { AmountKeypad } from "@/components/wallet/amount-keypad";
import { RecentWalletActivity } from "@/components/wallet/recent-wallet-activity";
import { MIN_FUNDING_AMOUNT, QUICK_FUND_AMOUNTS } from "@/lib/constants";
import { formatNaira } from "@/lib/format";
import { fundWalletSchema, type FundWalletValues } from "@/lib/validation";
import { FUNDING_FAILED_MESSAGE } from "@/lib/customer-messages";
import { GENERIC_ERROR_MESSAGE, errorText } from "@/lib/errors";
import { confirmWalletFundingAction, initiateWalletFundingAction } from "@/lib/actions/wallet";
import { cn, screenPanelClass } from "@/lib/utils";
import type { WalletTransaction } from "@/types";

type Step = "form" | "confirm" | "processing" | "success" | "failed" | "delayed";

export function FundWalletFlow({
  currentBalance,
  recentHistory = [],
}: {
  currentBalance: number;
  recentHistory?: WalletTransaction[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = React.useState<Step>("form");
  const [newBalance, setNewBalance] = React.useState(currentBalance);
  const [amount, setAmount] = React.useState(0);
  const [amountStr, setAmountStr] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const confirmingRef = React.useRef(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FundWalletValues>({
    resolver: zodResolver(fundWalletSchema),
    defaultValues: { amount: undefined },
  });

  const watchedAmount = watch("amount");

  function updateAmount(next: string) {
    const digitsOnly = next.replace(/\D/g, "");
    setAmountStr(digitsOnly);
    setValue("amount", digitsOnly ? Number(digitsOnly) : (undefined as unknown as number));
  }

  // Monipay's hosted checkout redirects the browser back here with our own
  // reference in the query string — pick that up and settle it server-side.
  React.useEffect(() => {
    const reference = searchParams.get("monipay_reference");
    if (!reference || confirmingRef.current) return;
    confirmingRef.current = true;

    setStep("processing");
    router.replace("/dashboard/wallet");

    confirmWalletFundingAction(reference)
      .then((res) => {
        if (!res.ok) {
          setError(errorText(res));
          setStep("failed");
          toast.error(errorText(res));
          return;
        }
        const result = res.data;
        if (result.outcome === "successful") {
          setNewBalance(result.newBalance ?? currentBalance);
          setStep("success");
          toast.success("Wallet funded");
          router.refresh();
        } else if (result.outcome === "pending") {
          setStep("delayed");
          toast.message("Confirming payment");
        } else {
          setError(FUNDING_FAILED_MESSAGE);
          setStep("failed");
          toast.error(FUNDING_FAILED_MESSAGE);
        }
      })
      .catch(() => {
        setError(GENERIC_ERROR_MESSAGE);
        setStep("failed");
      });
    // Only re-run if the query string itself changes — router/currentBalance are stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function onSubmitForm(values: FundWalletValues) {
    setAmount(values.amount);
    setError(null);
    setStep("confirm");
  }

  async function handlePay() {
    setError(null);
    setStep("processing");
    try {
      const res = await initiateWalletFundingAction(amount);
      if (!res.ok) {
        setError(errorText(res));
        toast.error(errorText(res));
        setStep("confirm");
        return;
      }
      window.location.href = res.data.authorizationUrl;
    } catch {
      setError(GENERIC_ERROR_MESSAGE);
      toast.error(GENERIC_ERROR_MESSAGE);
      setStep("confirm");
    }
  }

  function reset() {
    setStep("form");
    setValue("amount", undefined as unknown as number);
    setAmount(0);
    setAmountStr("");
    setError(null);
  }

  return (
    <>
      {step === "processing" ? (
        <div className={cn(screenPanelClass, "flex flex-col items-center justify-center gap-3 py-16 text-center")}>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Processing payment</p>
          </div>
        </div>
      ) : step === "success" ? (
        <div className={cn(screenPanelClass, "space-y-4 py-10 text-center")}>
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/10">
            <CircleCheckBig className="size-6 text-success" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Wallet funded</p>
            <p className="text-sm text-muted-foreground">New balance: {formatNaira(newBalance)}</p>
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
            <Button size="lg" onClick={reset}>Try again</Button>
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
              Your wallet will update automatically once the payment is confirmed.
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

          <Button className="w-full" size="lg" onClick={handlePay}>
            Pay {formatNaira(amount)}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmitForm)}
          method="post"
          className={cn("space-y-6", screenPanelClass)}
          noValidate
        >
          <p className="text-center text-xs text-muted-foreground">
            Available Balance <span className="font-medium text-foreground">{formatNaira(currentBalance)}</span>
          </p>

          <div className="flex items-center justify-center gap-1 py-2">
            <span className="text-4xl font-bold tabular-nums">
              ₦{amountStr ? Number(amountStr).toLocaleString() : "0"}
            </span>
            <span className="h-9 w-0.5 animate-pulse bg-foreground" aria-hidden="true" />
          </div>

          <QuickAmountPicker
            amounts={QUICK_FUND_AMOUNTS}
            selected={watchedAmount ?? null}
            onSelect={(v) => updateAmount(String(v))}
          />

          {errors.amount ? (
            <p className="text-center text-xs text-destructive">{errors.amount.message}</p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Minimum {formatNaira(MIN_FUNDING_AMOUNT, false)}
            </p>
          )}

          <AmountKeypad value={amountStr} onChange={updateAmount} />

          <Button type="submit" className="w-full" size="lg">
            Fund {amountStr ? formatNaira(Number(amountStr), false) : "Wallet"}
          </Button>

          <RecentWalletActivity history={recentHistory} />
        </form>
      )}
    </>
  );
}
