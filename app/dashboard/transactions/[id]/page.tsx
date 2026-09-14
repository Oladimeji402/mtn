import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TransactionDetail } from "@/components/transactions/transaction-detail";
import { getTransaction } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Transaction Details" };

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const transaction = await getTransaction(id);

  if (!transaction) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/transactions"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Transactions
      </Link>
      <TransactionDetail transaction={transaction} />
    </div>
  );
}
