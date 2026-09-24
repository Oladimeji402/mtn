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
      aria-pressed={selected}
      disabled={plan.available === false}
      className={cn(
        "relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-card p-4 text-center transition-colors",
        selected
          ? "border-brand bg-brand/10"
          : "border-border hover:border-foreground/25 hover:bg-secondary/40",
        plan.available === false && "cursor-not-allowed opacity-50 hover:border-border hover:bg-card",
      )}
    >
      {selected ? (
        <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Check className="size-3" />
        </span>
      ) : null}
      <p className="text-base font-semibold">{plan.size}</p>
      <p className="text-xs text-muted-foreground">{plan.validityDays} Days</p>
      <p className="text-base font-bold text-brand">{formatNaira(plan.price, false)}</p>
      {plan.available === false ? (
        <span className="absolute -top-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Unavailable now
        </span>
      ) : null}
    </button>
  );
}
