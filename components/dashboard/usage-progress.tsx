import { Progress } from "@/components/ui/progress";
import { formatGB, formatMB } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { UsageWindow } from "@/types";

export function UsageProgress({
  label,
  window,
}: {
  label: string;
  window: UsageWindow;
}) {
  const percent = Math.min((window.usedMB / window.limitMB) * 100, 100);
  const remaining = Math.max(window.limitMB - window.usedMB, 0);
  const state = percent >= 100 ? "reached" : percent >= 80 ? "near" : "normal";

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {formatGB(window.usedMB)} / {formatGB(window.limitMB)}
        </p>
      </div>
      <Progress
        value={percent}
        className={cn(
          "h-2",
          state === "reached" && "[&_[data-slot=progress-indicator]]:bg-destructive",
          state === "near" && "[&_[data-slot=progress-indicator]]:bg-warning",
        )}
      />
      <p
        className={cn(
          "text-xs",
          state === "reached"
            ? "text-destructive"
            : state === "near"
              ? "text-warning"
              : "text-muted-foreground",
        )}
      >
        {state === "reached"
          ? `You've reached your ${label.toLowerCase()} limit`
          : `${formatMB(remaining)} remaining`}
      </p>
    </div>
  );
}
