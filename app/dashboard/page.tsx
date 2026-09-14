import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WalletBalanceCard } from "@/components/dashboard/wallet-balance-card";
import { UsageProgress } from "@/components/dashboard/usage-progress";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";
import { getWallet } from "@/lib/services/wallet";
import { getUsage } from "@/lib/services/usage";
import { getTransactions } from "@/lib/services/transactions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [wallet, usage, transactions] = await Promise.all([
    getWallet(),
    getUsage(),
    getTransactions(),
  ]);

  const recent = transactions.slice(0, 3);

  return (
    <div className="space-y-5">
      <WalletBalanceCard balance={wallet.balance} />

      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-6">
        <div className="mb-4">
          <p className="text-sm font-medium">Data Allowance</p>
          <p className="text-xs text-muted-foreground">
            Your data purchase limit for today and this month.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <UsageProgress label="Today" window={usage.daily} />
          <UsageProgress label="This month" window={usage.monthly} />
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium">Recent activity</p>
          <Link
            href="/dashboard/transactions"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Your airtime and data purchases will show up here."
          />
        )}
      </div>
    </div>
  );
}
