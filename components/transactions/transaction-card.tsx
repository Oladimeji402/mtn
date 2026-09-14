import Link from "next/link";
import { Smartphone, Wifi } from "lucide-react";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatNaira, formatPhoneNumber } from "@/lib/format";
import type { Transaction } from "@/types";

export function TransactionCard({ transaction }: { transaction: Transaction }) {
  const Icon = transaction.type === "airtime" ? Smartphone : Wifi;
  const title =
    transaction.type === "airtime"
      ? "MTN Airtime"
      : `MTN Data — ${transaction.dataPlan?.size ?? ""}`;

  return (
    <Link
      href={`/dashboard/transactions/${transaction.id}`}
      className="flex items-center gap-3 rounded-lg border p-3.5 transition-colors hover:bg-secondary/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary">
        <Icon className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatPhoneNumber(transaction.phoneNumber)} · {formatDateTime(transaction.createdAt)}
        </p>
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <p className="text-sm font-medium">-{formatNaira(transaction.amount, false)}</p>
        <TransactionStatusBadge status={transaction.status} className="text-[11px]" />
      </div>
    </Link>
  );
}
