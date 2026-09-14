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
import type { Transaction } from "@/types";

export function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="hidden overflow-hidden rounded-lg border sm:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Phone number</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t) => (
            <TableRow key={t.id} className="cursor-pointer">
              <TableCell className="p-0">
                <Link
                  href={`/dashboard/transactions/${t.id}`}
                  className="block px-4 py-3 font-mono text-xs"
                >
                  {t.reference}
                </Link>
              </TableCell>
              <TableCell>
                {t.type === "airtime" ? "MTN Airtime" : `MTN Data — ${t.dataPlan?.size ?? ""}`}
              </TableCell>
              <TableCell>{formatPhoneNumber(t.phoneNumber)}</TableCell>
              <TableCell className="font-medium">-{formatNaira(t.amount, false)}</TableCell>
              <TableCell>
                <TransactionStatusBadge status={t.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDateTime(t.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
