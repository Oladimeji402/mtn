import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { WalletHistoryList } from "@/components/wallet/wallet-history-list";
import { getWalletHistory } from "@/lib/services/wallet";
import { screenPadClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Wallet History" };

export default async function WalletHistoryPage() {
  const history = await getWalletHistory();

  return (
    <div className="space-y-3 sm:space-y-6">
      <Link
        href="/dashboard/wallet"
        className={`flex min-h-11 w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground ${screenPadClass}`}
      >
        <ArrowLeft className="size-4" />
        Back to Wallet
      </Link>
      <PageHeader title="Wallet History" />
      <WalletHistoryList history={history} />
    </div>
  );
}
