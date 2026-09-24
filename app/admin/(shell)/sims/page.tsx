import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSimPool } from "@/components/admin/admin-sim-pool";
import { getSimPool } from "@/lib/services/sim-pool";

export const metadata: Metadata = { title: "Admin SIMs" };

export default async function AdminSimsPage() {
  const { sources, jobs, summary } = await getSimPool();

  return (
    <div className="space-y-6">
      <PageHeader
        title="SIMs"
        description="MTN SIMs used to fulfill data orders. The system automatically switches to the next available SIM when a limit is reached."
      />
      <AdminSimPool sources={sources} jobs={jobs} summary={summary} />
    </div>
  );
}
