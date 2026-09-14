import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { formatDateTime, formatNaira, formatPhoneNumber } from "@/lib/format";
import type { AdminTransaction } from "@/types";

export function AdminTransactionTable({ transactions }: { transactions: AdminTransaction[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Phone number</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                <TableCell>@{t.username}</TableCell>
                <TableCell>
                  {t.type === "airtime" ? "Airtime" : `Data — ${t.dataPlan?.size ?? ""}`}
                </TableCell>
                <TableCell>{formatPhoneNumber(t.phoneNumber)}</TableCell>
                <TableCell className="font-medium">{formatNaira(t.amount, false)}</TableCell>
                <TableCell>
                  <TransactionStatusBadge status={t.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/transactions/${t.id}`}
                    className="text-xs font-medium text-foreground hover:underline"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 sm:hidden">
        {transactions.map((t) => (
          <Link
            key={t.id}
            href={`/admin/transactions/${t.id}`}
            className="block rounded-lg border p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">
                  {t.type === "airtime" ? "Airtime" : `Data — ${t.dataPlan?.size ?? ""}`}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{t.username} · {formatPhoneNumber(t.phoneNumber)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium">{formatNaira(t.amount, false)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <TransactionStatusBadge status={t.status} />
              <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
