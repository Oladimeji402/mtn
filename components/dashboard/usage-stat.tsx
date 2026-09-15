import { formatGB } from "@/lib/format";

export function UsageStat({ label, usedMB }: { label: string; usedMB: number }) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{formatGB(usedMB)}</p>
    </div>
  );
}
