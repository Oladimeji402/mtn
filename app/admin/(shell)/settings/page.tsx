import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";

export const metadata: Metadata = { title: "Admin Settings" };

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <AdminSettingsForm />
    </div>
  );
}
