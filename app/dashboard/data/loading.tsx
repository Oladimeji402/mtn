import { Skeleton } from "@/components/ui/skeleton";

export default function DataLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-5 rounded-xl border bg-card p-6">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
