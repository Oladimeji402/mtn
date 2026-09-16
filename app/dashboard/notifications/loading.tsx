import { Skeleton } from "@/components/ui/skeleton";
import { screenPadClass } from "@/lib/utils";

export default function NotificationsLoading() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <div className={screenPadClass}>
        <Skeleton className="h-6 w-36" />
      </div>
      <div className="divide-y border-y sm:space-y-2 sm:divide-y-0 sm:border-0 sm:px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-none sm:rounded-lg" />
        ))}
      </div>
    </div>
  );
}
