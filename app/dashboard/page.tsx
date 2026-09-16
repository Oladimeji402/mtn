import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WalletBalanceCard } from "@/components/dashboard/wallet-balance-card";
import { DashboardQuickActions } from "@/components/dashboard/quick-actions";
import { UsageStat } from "@/components/dashboard/usage-stat";
import { TransactionCard } from "@/components/transactions/transaction-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";
import { getWallet } from "@/lib/services/wallet";
import { getUsage } from "@/lib/services/usage";
import { getTransactions } from "@/lib/services/transactions";
import { screenPadClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [wallet, usage, transactions] = await Promise.all([
    getWallet(),
    getUsage(),
    getTransactions(),
  ]);

  const recent = transactions.slice(0, 3);

  return (
    // -mt-3 cancels the shell's mobile top padding so the balance card meets the app bar.
    <div className="-mt-3 space-y-0 sm:mt-0 sm:space-y-5">
      <WalletBalanceCard balance={wallet.balance} />

      <DashboardQuickActions />

      <div className="border-t px-4 py-5 sm:rounded-xl sm:border sm:p-6">
        <div className="mb-4">
          <p className="text-sm font-medium">Data Purchased</p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <UsageStat label="Today" usedMB={usage.daily.usedMB} />
          <UsageStat label="This month" usedMB={usage.monthly.usedMB} />
        </div>
      </div>

      <div className="border-t sm:rounded-xl sm:border sm:p-6">
        <div className={`mb-3 flex items-center justify-between pt-5 sm:mb-4 sm:pt-0 ${screenPadClass}`}>
          <p className="text-sm font-medium">Recent activity</p>
          <Link
            href="/dashboard/transactions"
            className="flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground sm:min-h-0"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {recent.length > 0 ? (
          <div className="divide-y border-t sm:space-y-2 sm:divide-y-0 sm:border-t-0">
            {recent.map((t) => (
              <TransactionCard key={t.id} transaction={t} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No transactions yet"
            description="Buy airtime or data to get started."
            className="bg-transparent py-8"
          />
        )}
      </div>
    </div>
  );
}
