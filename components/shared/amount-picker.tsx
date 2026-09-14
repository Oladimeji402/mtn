"use client";

import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

export function QuickAmountPicker({
  amounts,
  selected,
  onSelect,
}: {
  amounts: number[];
  selected: number | null;
  onSelect: (amount: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {amounts.map((amount) => (
        <Button
          key={amount}
          type="button"
          variant="outline"
          onClick={() => onSelect(amount)}
          className={cn(
            "h-11 font-medium",
            selected === amount &&
              "border-primary bg-primary/10 text-foreground ring-1 ring-primary",
          )}
        >
          {formatNaira(amount, false)}
        </Button>
      ))}
    </div>
  );
}
