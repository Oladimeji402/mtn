import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { DataPurchaseFlow } from "@/components/data/data-purchase-flow";
import { getDataPlans } from "@/lib/services/data-plans";
import { getWallet } from "@/lib/services/wallet";

export const metadata: Metadata = { title: "Buy Data" };

export default async function BuyDataPage() {
  const [plans, wallet] = await Promise.all([getDataPlans(), getWallet()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Buy Data" description="Choose a plan and top up MTN data instantly." />
      <DataPurchaseFlow plans={plans} walletBalance={wallet.balance} />
    </div>
  );
}
