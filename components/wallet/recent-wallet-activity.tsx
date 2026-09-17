import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, History } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WalletTransaction, WalletTransactionType } from "@/types";

const typeLabel: Record<WalletTransactionType, string> = {
  funding: "Wallet funding",
  airtime: "MTN Airtime",
  data: "MTN Data",
  refund: "Refund",
  adjustment: "Wallet adjustment",
};

export function RecentWalletActivity({ history }: { history: WalletTransaction[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Recent transactions</p>
        <Link
          href="/dashboard/wallet/history"
          className="flex min-h-8 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          See all
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={History}
          title="No transactions yet"
          description="Fund your wallet to get started."
          className="bg-transparent py-8"
        />
      ) : (
        <div className="divide-y rounded-xl border">
          {history.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    tx.direction === "credit" ? "bg-success/10 text-success" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {tx.direction === "credit" ? (
                    <ArrowDownLeft className="size-4" />
                  ) : (
                    <ArrowUpRight className="size-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{typeLabel[tx.type]}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt)}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={cn("text-sm font-medium", tx.direction === "credit" && "text-success")}>
                  {tx.direction === "credit" ? "+" : "-"}
                  {formatNaira(tx.amount, false)}
                </p>
                <TransactionStatusBadge status={tx.status} className="text-[10px]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
