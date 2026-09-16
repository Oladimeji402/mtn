import { Skeleton } from "@/components/ui/skeleton";
import { screenPadClass, screenPanelClass } from "@/lib/utils";

export default function WalletLoading() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className={`flex items-center justify-between ${screenPadClass}`}>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-11 w-24 sm:h-9 sm:w-36" />
      </div>
      <div className={`space-y-5 ${screenPanelClass}`}>
        <Skeleton className="h-4 w-24" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
