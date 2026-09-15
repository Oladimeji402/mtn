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
import { TransactionTable } from "@/components/transactions/transaction-table";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { EmptyState } from "@/components/shared/empty-state";
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
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Your airtime and data purchases will show up here once you make one."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard/data">Buy Data Now</Link>
          </Button>
        }
      />
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
        <EmptyState
          icon={Receipt}
          title="No matching transactions"
          description="Try a different filter or search term."
        />
      ) : (
        <>
          <TransactionTable transactions={filtered} />
          <div className="space-y-2 sm:hidden">
            {filtered.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
