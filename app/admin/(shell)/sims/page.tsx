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
        description="The MTN SIMs that supply data for SIM plans. An order uses one SIM, and when it hits its daily limit or runs out of data the next order moves to another."
      />
      <AdminSimPool sources={sources} jobs={jobs} summary={summary} />
    </div>
  );
}
