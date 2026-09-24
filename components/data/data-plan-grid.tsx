"use client";

import { DataPlanCard } from "@/components/data/data-plan-card";
import type { DataPlan } from "@/types";

export function DataPlanGrid({
  plans,
  selectedId,
  onSelect,
}: {
  plans: DataPlan[];
  selectedId: string | null;
  onSelect: (plan: DataPlan) => void;
}) {
  return (
    <div className={plans.length === 1 ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
      {plans.map((plan) => (
        <DataPlanCard
          key={plan.id}
          plan={plan}
          selected={selectedId === plan.id}
          onSelect={() => onSelect(plan)}
        />
      ))}
    </div>
  );
}
