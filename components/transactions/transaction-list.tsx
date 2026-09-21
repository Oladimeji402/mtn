"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TransactionFilters,
  type TransactionFilterValue,
} from "@/components/transactions/transaction-filters";
import { TransactionStats } from "@/components/transactions/transaction-stats";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { EmptyState } from "@/components/shared/empty-state";
import { screenPadClass } from "@/lib/utils";
import type { Transaction } from "@/types";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = React.useState<TransactionFilterValue>("all");
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    return transactions.filter((t) => {
      const matchesFilter =
        filter === "all" ||
        t.type === filter ||
        t.status === filter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        t.reference.toLowerCase().includes(query) ||
        t.phoneNumber.includes(query);
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  if (transactions.length === 0) {
    return (
      <div className={screenPadClass}>
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Buy airtime or data to get started."
          action={
            <Button asChild size="sm">
              <Link href="/dashboard/data">Buy data</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TransactionStats transactions={transactions} active={filter} onSelect={setFilter} />

      <TransactionFilters
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <div className={screenPadClass}>
          <EmptyState
            icon={Receipt}
            title="No matching transactions"
            description="Try a different filter or search term."
          />
        </div>
      ) : (
        <>
          <div className="divide-y border-y">
            {filtered.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
