import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FundWalletFlow } from "@/components/wallet/fund-wallet-flow";
import { getWallet } from "@/lib/services/wallet";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const wallet = await getWallet();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fund Wallet"
        description="Add money to your wallet to buy MTN airtime and data."
        action={
          <Button variant="outline" asChild>
            <Link href="/dashboard/wallet/history">
              <History className="size-4" />
              Wallet History
            </Link>
          </Button>
        }
      />
      <FundWalletFlow currentBalance={wallet.balance} />
    </div>
  );
}
