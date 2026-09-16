"use client";

import * as React from "react";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime, formatNaira } from "@/lib/format";
import { cn, screenPadClass } from "@/lib/utils";
import type { WalletTransaction, WalletTransactionType } from "@/types";

const typeLabel: Record<WalletTransactionType, string> = {
  funding: "Wallet funding",
  airtime: "MTN Airtime",
  data: "MTN Data",
  refund: "Refund",
  adjustment: "Wallet adjustment",
};

const filters: { value: "all" | WalletTransactionType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "funding", label: "Funding" },
  { value: "airtime", label: "Airtime" },
  { value: "data", label: "Data" },
  { value: "refund", label: "Refunds" },
];

export function WalletHistoryList({ history }: { history: WalletTransaction[] }) {
  const [filter, setFilter] = React.useState<"all" | WalletTransactionType>("all");

  const filtered = React.useMemo(
    () => (filter === "all" ? history : history.filter((h) => h.type === filter)),
    [history, filter],
  );

  return (
    <div className="space-y-4">
      <div className={screenPadClass}>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="h-11 w-full justify-start overflow-x-auto sm:h-8 sm:w-auto">
            {filters.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={History} title="No wallet activity" description="Nothing matches this filter yet." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.reference}</TableCell>
                    <TableCell>{typeLabel[tx.type]}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 font-medium",
                          tx.direction === "credit" ? "text-success" : "text-foreground",
                        )}
                      >
                        {tx.direction === "credit" ? (
                          <ArrowDownLeft className="size-3.5" />
                        ) : (
                          <ArrowUpRight className="size-3.5" />
                        )}
                        {tx.direction === "credit" ? "+" : "-"}
                        {formatNaira(tx.amount, false)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={tx.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(tx.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="divide-y border-y sm:hidden">
            {filtered.map((tx) => (
              <div key={tx.id} className="min-h-16 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">{typeLabel[tx.type]}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {tx.reference}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm font-medium",
                      tx.direction === "credit" ? "text-success" : "text-foreground",
                    )}
                  >
                    {tx.direction === "credit" ? "+" : "-"}
                    {formatNaira(tx.amount, false)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <TransactionStatusBadge status={tx.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(tx.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
