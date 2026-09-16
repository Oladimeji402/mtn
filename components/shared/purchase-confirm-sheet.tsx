"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Check, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatNaira } from "@/lib/format";

export type ConfirmRow = { label: string; value: string };

/**
 * Phone-only confirm step: a bottom sheet over the form, so confirming never
 * feels like navigating to another screen. From sm up the flows keep their
 * in-page confirm step instead and never mount this.
 */
export function PurchaseConfirmSheet({
  open,
  onOpenChange,
  title,
  amount,
  rows,
  walletBalance,
  actionLabel,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  amount: number;
  rows: ConfirmRow[];
  walletBalance: number;
  actionLabel: string;
  onConfirm: () => void;
  children?: React.ReactNode;
}) {
  const shortfall = amount - walletBalance;
  const canPay = shortfall <= 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        overlayClassName="bg-foreground/30"
        className="max-h-[92dvh] min-h-[50dvh] gap-0 overflow-y-auto rounded-t-2xl px-4 pt-14 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="absolute top-2 left-2 size-11">
            <X className="size-5" />
            <span className="sr-only">Close</span>
          </Button>
        </SheetClose>

        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">
          Check the details, then confirm to pay from your wallet.
        </SheetDescription>

        <p className="text-center text-3xl font-semibold tracking-tight tabular-nums">
          {formatNaira(amount)}
        </p>

        <dl className="mt-6 divide-y rounded-xl bg-secondary/50 px-4">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-right text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {canPay ? (
          <>
            <p className="mt-5 text-xs font-medium text-muted-foreground">
              Pay from
            </p>
            <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary bg-primary/5 p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15">
                <Wallet className="size-4.5 text-brand-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Wallet</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatNaira(walletBalance)} available
                </p>
              </div>
              <Check className="size-5 shrink-0 text-primary" />
            </div>
            {children}
          </>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
            <AlertTriangle className="size-5 shrink-0 text-warning" />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Not enough in your wallet</p>
              <p className="text-xs text-muted-foreground">
                Wallet balance {formatNaira(walletBalance)}. Add{" "}
                {formatNaira(shortfall)} to continue.
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-6">
          {canPay ? (
            <Button className="w-full" size="lg" onClick={onConfirm}>
              {actionLabel}
            </Button>
          ) : (
            <Button className="w-full" size="lg" asChild>
              <Link href="/dashboard/wallet">Fund Wallet</Link>
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
