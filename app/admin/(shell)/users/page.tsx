import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AdminUsersList } from "@/components/admin/admin-users-list";
import { getUsers } from "@/lib/services/users";

export const metadata: Metadata = { title: "Admin Users" };

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Monitor and manage customer accounts." />
      <AdminUsersList users={users} />
    </div>
  );
}
