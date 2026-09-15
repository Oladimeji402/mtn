import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TransactionFilterValue } from "@/components/transactions/transaction-filters";
import type { Transaction } from "@/types";

const stats: {
  status: Extract<TransactionFilterValue, "successful" | "processing" | "pending" | "failed">;
  label: string;
  icon: typeof CheckCircle2;
  className: string;
}[] = [
  { status: "successful", label: "Successful", icon: CheckCircle2, className: "text-success" },
  { status: "processing", label: "Processing", icon: Loader2, className: "text-info" },
  { status: "pending", label: "Pending", icon: Clock, className: "text-warning" },
  { status: "failed", label: "Failed", icon: XCircle, className: "text-destructive" },
];

export function TransactionStats({
  transactions,
  active,
  onSelect,
}: {
  transactions: Transaction[];
  active: TransactionFilterValue;
  onSelect: (status: TransactionFilterValue) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((stat) => {
        const count = transactions.filter((t) => t.status === stat.status).length;
        const isActive = active === stat.status;
        return (
          <button
            key={stat.status}
            type="button"
            onClick={() => onSelect(isActive ? "all" : stat.status)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border bg-card py-3.5 transition-colors",
              isActive ? "border-foreground/30 bg-secondary/50" : "hover:bg-secondary/30",
            )}
          >
            <stat.icon className={cn("size-4", stat.className)} />
            <p className="text-lg font-semibold leading-none">{count}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </button>
        );
      })}
    </div>
  );
}
