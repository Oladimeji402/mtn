"use client";

import * as React from "react";
import { Receipt, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminTransactionTable } from "@/components/admin/admin-transaction-table";
import { EmptyState } from "@/components/shared/empty-state";
import type { AdminTransaction } from "@/types";

type StatusFilter = "all" | "successful" | "processing" | "pending" | "failed" | "refunded";
type TypeFilter = "all" | "airtime" | "data";
type DateFilter = "all" | "today" | "7d" | "30d";

export function AdminTransactionList({ transactions }: { transactions: AdminTransaction[] }) {
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [type, setType] = React.useState<TypeFilter>("all");
  const [date, setDate] = React.useState<DateFilter>("all");
  const [now] = React.useState(() => Date.now());

  const filtered = React.useMemo(() => {
    const cutoff = { today: 1000 * 60 * 60 * 24, "7d": 1000 * 60 * 60 * 24 * 7, "30d": 1000 * 60 * 60 * 24 * 30 }[
      date as "today" | "7d" | "30d"
    ];

    return transactions.filter((t) => {
      const matchesStatus = status === "all" || t.status === status;
      const matchesType = type === "all" || t.type === type;
      const matchesDate = date === "all" || now - new Date(t.createdAt).getTime() <= (cutoff ?? Infinity);
      const query = search.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        t.reference.toLowerCase().includes(query) ||
        t.username.toLowerCase().includes(query) ||
        t.phoneNumber.includes(query);
      return matchesStatus && matchesType && matchesDate && matchesSearch;
    });
  }, [transactions, search, status, type, date]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by reference, user or phone number"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={(v) => setType(v as TypeFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="airtime">Airtime</SelectItem>
            <SelectItem value="data">Data</SelectItem>
          </SelectContent>
        </Select>
        <Select value={date} onValueChange={(v) => setDate(v as DateFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="today">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="successful">Successful</TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="refunded">Refunded</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No matching transactions" description="Try a different filter or search term." />
      ) : (
        <AdminTransactionTable transactions={filtered} />
      )}
    </div>
  );
}
