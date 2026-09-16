import { Skeleton } from "@/components/ui/skeleton";
import { screenPadClass, screenPanelClass } from "@/lib/utils";

export default function DataLoading() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className={`space-y-2 ${screenPadClass}`}>
        <Skeleton className="h-6 w-28" />
      </div>
      <div className={`space-y-5 ${screenPanelClass}`}>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
