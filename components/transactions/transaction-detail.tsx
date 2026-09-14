"use client";

import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatNaira, formatPhoneNumber, formatTime } from "@/lib/format";
import type { Transaction } from "@/types";

const statusMessages: Record<Transaction["status"], string> = {
  pending: "Your purchase is waiting to be processed.",
  processing: "Your purchase is being processed by the network.",
  successful: "This purchase was delivered successfully.",
  failed: "This purchase could not be completed. You were not charged.",
  refunded: "This purchase failed and the amount was refunded to your wallet.",
};

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
      toast.success("Receipt details copied to clipboard");
    } catch {
      toast.error("Couldn't share. Please try again.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatNaira(transaction.amount)}
            </p>
          </div>
          <TransactionStatusBadge status={transaction.status} className="text-sm" />
        </div>

        <p className="border-b py-4 text-sm text-muted-foreground">
          {transaction.statusMessage ?? statusMessages[transaction.status]}
        </p>

        <dl className="divide-y">
          <DetailRow label="Reference">
            <span className="flex items-center gap-1 font-mono text-sm">
              {transaction.reference}
              <CopyButton value={transaction.reference} label="" />
            </span>
          </DetailRow>
          <DetailRow label="Type">
            {transaction.type === "airtime" ? "Airtime" : "Data"}
          </DetailRow>
          <DetailRow label="Network">{transaction.network}</DetailRow>
          <DetailRow label="Phone number">{formatPhoneNumber(transaction.phoneNumber)}</DetailRow>
          {transaction.dataPlan ? (
            <DetailRow label="Data plan">
              {transaction.dataPlan.size} · {transaction.dataPlan.validityLabel}
            </DetailRow>
          ) : null}
          <DetailRow label="Date">{formatDate(transaction.createdAt)}</DetailRow>
          <DetailRow label="Time">{formatTime(transaction.createdAt)}</DetailRow>
          {transaction.providerReference ? (
            <DetailRow label="Provider reference">
              <span className="font-mono text-sm">{transaction.providerReference}</span>
            </DetailRow>
          ) : null}
          {transaction.failureReason ? (
            <DetailRow label="Note">
              <span className="text-destructive">{transaction.failureReason}</span>
            </DetailRow>
          ) : null}
        </dl>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="size-4" />
          Download Receipt
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleShare}>
          <Share2 className="size-4" />
          Share Receipt
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
