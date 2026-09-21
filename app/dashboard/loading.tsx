import { Skeleton } from "@/components/ui/skeleton";
import { screenPanelClass } from "@/lib/utils";

export default function DashboardLoading() {
  return (
    <div className="-mt-3 space-y-0 sm:mt-0 sm:space-y-5">
      <div className="rounded-b-3xl bg-gradient-to-br from-brand to-amber-500 px-4 pb-5 pt-4 sm:rounded-2xl sm:p-5">
        <Skeleton className="h-3.5 w-28 bg-white/40" />
        <Skeleton className="mt-2 h-8 w-40 bg-white/40" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Skeleton className="h-12 bg-white/40" />
          <Skeleton className="h-12 bg-white/40" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 px-4 py-5 sm:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="size-14 rounded-2xl" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>

      <div className={screenPanelClass}>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>

      <div className={screenPanelClass}>
        <Skeleton className="mb-4 h-4 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
