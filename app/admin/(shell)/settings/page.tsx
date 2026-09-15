import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { getPlatformSettings } from "@/lib/services/admin";

export const metadata: Metadata = { title: "Admin Settings" };

export default async function AdminSettingsPage() {
  const settings = await getPlatformSettings();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure platform-wide purchase limits." />
      <AdminSettingsForm settings={settings} />
    </div>
  );
}
