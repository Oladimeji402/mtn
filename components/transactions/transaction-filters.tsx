"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type TransactionFilterValue =
  | "all"
  | "airtime"
  | "data"
  | "successful"
  | "processing"
  | "pending"
  | "failed"
  | "refunded";

const filters: { value: TransactionFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "airtime", label: "Airtime" },
  { value: "data", label: "Data" },
  { value: "successful", label: "Successful" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export function TransactionFilters({
  filter,
  onFilterChange,
  search,
  onSearchChange,
}: {
  filter: TransactionFilterValue;
  onFilterChange: (v: TransactionFilterValue) => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by reference or phone number"
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as TransactionFilterValue)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {filters.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
