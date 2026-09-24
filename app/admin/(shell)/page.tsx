import type { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  Wallet,
  Wifi,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminTransactionTable } from "@/components/admin/admin-transaction-table";
import { formatNaira } from "@/lib/format";
import { getAdminDashboardStats } from "@/lib/services/admin";
import { getAdminTransactions } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  const [stats, transactions] = await Promise.all([
    getAdminDashboardStats(),
    getAdminTransactions(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AdminStatCard label="Total users" value={String(stats.totalUsers)} icon={Users} />
        <AdminStatCard
          label="Active users"
          value={String(stats.activeUsers)}
          icon={UserCheck}
          tone="success"
        />
        <AdminStatCard
          label="Transactions today"
          value={String(stats.transactionsToday)}
          icon={Clock}
        />
        <AdminStatCard
          label="Successful"
          value={String(stats.successfulTransactions)}
          icon={CheckCircle2}
          tone="success"
        />
        <AdminStatCard
          label="Failed"
          value={String(stats.failedTransactions)}
          icon={XCircle}
          tone="destructive"
        />
        <AdminStatCard
          label="Pending"
          value={String(stats.pendingTransactions)}
          icon={Clock}
          tone="warning"
        />
        <AdminStatCard
          label="Data sales today"
          value={formatNaira(stats.dataSalesToday, false)}
          icon={Wifi}
        />
        <AdminStatCard
          label="Wallet funding today"
          value={formatNaira(stats.walletFundingToday, false)}
          icon={Wallet}
          tone="success"
        />
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <p className="font-medium">Recent transactions</p>
        <AdminTransactionTable transactions={transactions.slice(0, 6)} />
      </div>
    </div>
  );
}
