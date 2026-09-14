import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentAdmin } from "@/lib/services/admin";

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();

  return <AdminShell username={admin.username}>{children}</AdminShell>;
}
