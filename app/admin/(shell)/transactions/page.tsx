import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminTransactionList } from "@/components/admin/admin-transaction-list";
import { getAdminTransactions } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Admin Transactions" };

export default async function AdminTransactionsPage() {
  const transactions = await getAdminTransactions();

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" description="All airtime and data purchases across users." />
      <AdminTransactionList transactions={transactions} />
    </div>
  );
}
