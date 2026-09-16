"use client";

import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatNaira, formatPhoneNumber, formatTime } from "@/lib/format";
import { cn, screenPadClass, screenPanelClass } from "@/lib/utils";
import type { Transaction } from "@/types";

export function TransactionDetail({ transaction }: { transaction: Transaction }) {
  function handleDownload() {
    toast.success("Receipt downloaded", {
      description: `${transaction.reference}.pdf saved to your device.`,
    });
  }

  async function handleShare() {
    const summary = `MTN ${transaction.type === "airtime" ? "Airtime" : "Data"} — ${formatNaira(
      transaction.amount,
    )} to ${formatPhoneNumber(transaction.phoneNumber)}\nReference: ${transaction.reference}\nStatus: ${transaction.status}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Transaction receipt", text: summary });
        return;
      } catch {
        // user cancelled — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Copied");
    } catch {
      toast.error("Could not share");
    }
  }

  return (
    <div className="space-y-5">
      <div className={cn(screenPanelClass)}>
        <div className="flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {transaction.type === "airtime" ? "Airtime" : "Data"}
            </p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatNaira(transaction.amount)}
            </p>
          </div>
          <TransactionStatusBadge status={transaction.status} className="text-sm" />
        </div>

        <dl className="divide-y">
          <DetailRow label="To">{formatPhoneNumber(transaction.phoneNumber)}</DetailRow>
          {transaction.dataPlan ? (
            <DetailRow label="Plan">
              {transaction.dataPlan.size} · {transaction.dataPlan.validityLabel}
            </DetailRow>
          ) : null}
          <DetailRow label="When">
            {formatDate(transaction.createdAt)} · {formatTime(transaction.createdAt)}
          </DetailRow>
          <DetailRow label="Reference">
            <span className="flex items-center gap-1 font-mono text-sm">
              {transaction.reference}
              <CopyButton value={transaction.reference} label="" />
            </span>
          </DetailRow>
          {transaction.failureReason ? (
            <DetailRow label="Note">
              <span className="text-destructive">{transaction.failureReason}</span>
            </DetailRow>
          ) : null}
        </dl>
      </div>

      <div className={`flex flex-col gap-2 ${screenPadClass} sm:flex-row`}>
        <Button variant="outline" size="lg" className="flex-1" onClick={handleDownload}>
          <Download className="size-4" />
          Download
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={handleShare}>
          <Share2 className="size-4" />
          Share
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
