import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { cn, screenPanelClass } from "@/lib/utils";

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
    <div className={cn("space-y-5", screenPanelClass)}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
          <AlertTriangle className="size-5 text-warning" />
        </span>
        <div className="space-y-1">
          <p className="font-medium">Not enough balance</p>
          <p className="text-sm text-muted-foreground">
            You need {formatNaira(shortfall)} more to continue.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild size="lg" className="flex-1">
          <Link href="/dashboard/wallet">Fund Wallet</Link>
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
