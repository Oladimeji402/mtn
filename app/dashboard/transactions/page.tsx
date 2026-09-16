import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionList } from "@/components/transactions/transaction-list";
import { getTransactions } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const transactions = await getTransactions();

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Transactions" />
      <TransactionList transactions={transactions} />
    </div>
  );
}
