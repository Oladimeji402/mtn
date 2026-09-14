"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataPlanCard } from "@/components/data/data-plan-card";
import type { DataPlan } from "@/types";

const categories: { value: DataPlan["category"]; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function DataPlanGrid({
  plans,
  selectedId,
  onSelect,
}: {
  plans: DataPlan[];
  selectedId: string | null;
  onSelect: (plan: DataPlan) => void;
}) {
  const [category, setCategory] = React.useState<DataPlan["category"]>("monthly");
  const filtered = plans.filter((p) => p.category === category);

  return (
    <div className="space-y-4">
      <Tabs value={category} onValueChange={(v) => setCategory(v as DataPlan["category"])}>
        <TabsList>
          {categories.map((c) => (
            <TabsTrigger key={c.value} value={c.value as string}>
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((plan) => (
          <DataPlanCard
            key={plan.id}
            plan={plan}
            selected={selectedId === plan.id}
            onSelect={() => onSelect(plan)}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Prices and validity shown are estimates and may change based on live provider pricing.
      </p>
    </div>
  );
}
