import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="h-11 w-full sm:w-36" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
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
