import { Check } from "lucide-react";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DataPlan } from "@/types";

export function DataPlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: DataPlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex min-h-[5.5rem] flex-col items-start gap-1 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "hover:border-foreground/30 hover:bg-secondary/40",
      )}
    >
      {plan.popular ? (
        <span className="absolute -top-2 right-3 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-brand-foreground">
          Popular
        </span>
      ) : null}
      {selected ? (
        <span className="absolute right-3 top-3 flex size-4.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      ) : null}
      <p className="text-lg font-semibold">{plan.size}</p>
      <p className="text-xs text-muted-foreground">{plan.validityLabel}</p>
      <p className="mt-2 text-sm font-medium">{formatNaira(plan.price, false)}</p>
    </button>
  );
}
