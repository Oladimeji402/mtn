import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { AdminResolveOrder } from "@/components/admin/admin-resolve-order";
import { formatDate, formatNaira, formatPhoneNumber, formatTime } from "@/lib/format";
import { getAdminTransaction } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Admin Transaction Details" };

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await getAdminTransaction(id);

  if (!transaction) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/transactions"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Transactions
      </Link>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 border-b pb-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-semibold tracking-tight">
              {formatNaira(transaction.amount)}
            </p>
          </div>
          <TransactionStatusBadge status={transaction.status} className="text-sm" />
        </div>

        <dl className="divide-y">
          <Row label="Reference" value={transaction.reference} mono />
          <Row label="User">
            <Link href={`/admin/users/${transaction.userId}`} className="font-medium hover:underline">
              @{transaction.username}
            </Link>
          </Row>
          <Row label="Phone number" value={formatPhoneNumber(transaction.phoneNumber)} />
          <Row label="Network" value={transaction.network} />
          <Row label="Type" value={transaction.type === "airtime" ? "Airtime" : "Data"} />
          {transaction.dataPlan ? (
            <Row label="Data plan" value={`${transaction.dataPlan.size} · ${transaction.dataPlan.validityLabel}`} />
          ) : null}
          <Row label="Created" value={`${formatDate(transaction.createdAt)} · ${formatTime(transaction.createdAt)}`} />
          <Row
            label="Completed"
            value={
              transaction.completedAt
                ? `${formatDate(transaction.completedAt)} · ${formatTime(transaction.completedAt)}`
                : "—"
            }
          />
          <Row label="Provider reference" value={transaction.providerReference ?? "—"} mono />
          {transaction.failureReason ? (
            <Row label="Note">
              <span className="text-destructive">{transaction.failureReason}</span>
            </Row>
          ) : null}
        </dl>
      </div>

      {transaction.status === "processing" ? (
        <div className="space-y-3 rounded-xl border border-warning/40 bg-warning/5 p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium">This order is still processing</p>
            <p className="text-sm text-muted-foreground">
              If it has been stuck a while, check whether the customer really received the data, then settle it here.
            </p>
          </div>
          <AdminResolveOrder purchaseId={transaction.id} />
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : "font-medium"}>{children ?? value}</dd>
    </div>
  );
}
