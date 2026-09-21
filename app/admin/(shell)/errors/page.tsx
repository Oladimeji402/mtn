import type { Metadata } from "next";
import { CircleCheckBig, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorLog } from "@/lib/services/error-log";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admin Errors" };

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const entries = await getErrorLog(ref);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Errors"
        description="Unexpected errors, newest first. Customers only see a generic message with a reference — search it here."
      />

      <form method="get" className="flex max-w-sm gap-2 px-4 sm:px-0">
        <Input name="ref" defaultValue={ref ?? ""} placeholder="Search by reference, e.g. 7K2M9QXA" className="font-mono" />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Search
        </Button>
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon={CircleCheckBig}
          title={ref ? "No error with that reference" : "No errors recorded"}
          description={ref ? "Check the reference and try again." : "Nothing has gone wrong recently."}
        />
      ) : (
        <ul className="divide-y rounded-lg border">
          {entries.map((e) => (
            <li key={e.id} className="p-4">
              <details>
                <summary className="flex cursor-pointer list-none flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                  <span className="font-mono text-sm font-semibold">{e.ref}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(e.createdAt)}</span>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs">{e.source}</span>
                  {e.username ? <span className="text-xs text-muted-foreground">@{e.username}</span> : null}
                  <span className="min-w-0 flex-1 truncate text-sm text-destructive">{e.message}</span>
                </summary>
                <div className="mt-3 space-y-3 text-xs">
                  {e.path ? <p><span className="text-muted-foreground">Path:</span> {e.path}</p> : null}
                  <p className="whitespace-pre-wrap break-words text-sm text-destructive">{e.message}</p>
                  {Object.keys(e.context).length > 0 ? (
                    <pre className="overflow-x-auto rounded bg-secondary p-3">{JSON.stringify(e.context, null, 2)}</pre>
                  ) : null}
                  {e.stack ? <pre className="max-h-64 overflow-auto rounded bg-secondary p-3">{e.stack}</pre> : null}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
