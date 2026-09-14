"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const rules = [
  { test: (v: string) => v.length >= 8, label: "At least 8 characters" },
  { test: (v: string) => /[A-Z]/.test(v), label: "One uppercase letter" },
  { test: (v: string) => /[a-z]/.test(v), label: "One lowercase letter" },
  { test: (v: string) => /[0-9]/.test(v), label: "One number" },
];

export function PasswordStrength({ password }: { password: string }) {
  const passedCount = rules.filter((r) => r.test(password)).length;

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {rules.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full bg-muted transition-colors",
              i < passedCount &&
                (passedCount <= 2
                  ? "bg-destructive"
                  : passedCount === 3
                    ? "bg-warning"
                    : "bg-success"),
            )}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((rule) => {
          const passed = rule.test(password);
          return (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                passed ? "text-success" : "text-muted-foreground",
              )}
            >
              {passed ? <Check className="size-3" /> : <X className="size-3" />}
              {rule.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
