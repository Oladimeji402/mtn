import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AirtimePurchaseFlow } from "@/components/airtime/airtime-purchase-flow";
import { getWallet } from "@/lib/services/wallet";

export const metadata: Metadata = { title: "Buy Airtime" };

export default async function BuyAirtimePage() {
  const wallet = await getWallet();

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Buy Airtime" />
      <AirtimePurchaseFlow walletBalance={wallet.balance} />
    </div>
  );
}
