import { Skeleton } from "@/components/ui/skeleton";
import { screenPadClass } from "@/lib/utils";

export default function TransactionsLoading() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className={screenPadClass}>
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 sm:gap-2 sm:bg-transparent sm:px-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-none sm:rounded-xl" />
        ))}
      </div>
      <div className={screenPadClass}>
        <Skeleton className="h-12 w-full" />
      </div>
      <div className="divide-y border-y">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-none" />
        ))}
      </div>
    </div>
  );
}
