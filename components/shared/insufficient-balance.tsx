import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

export function InsufficientBalance({
  balance,
  amount,
  onCancel,
}: {
  balance: number;
  amount: number;
  onCancel: () => void;
}) {
  const shortfall = amount - balance;

  return (
    <div className="space-y-5 rounded-xl border border-destructive/20 bg-destructive/5 p-5 sm:p-6">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Wallet balance</span>
          <span className="font-medium">{formatNaira(balance)}</span>
        </div>
        <div className="flex justify-between border-t pt-3 text-sm">
          <span className="text-muted-foreground">Purchase</span>
          <span className="font-medium">{formatNaira(amount)}</span>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">Insufficient wallet balance</p>
          <p className="text-sm text-muted-foreground">
            You need {formatNaira(shortfall)} more to complete this purchase.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href="/dashboard/wallet">Fund Wallet</Link>
        </Button>
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
