import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentAdmin } from "@/lib/services/admin";

// Authenticated, per-user data — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function AdminShellLayout({ children }: { children: React.ReactNode }) {
  let username: string;
  try {
    username = (await getCurrentAdmin()).username;
  } catch {
    // Either not signed in, or signed in but not an admin_users row — either way,
    // this is not a page they should see.
    redirect("/admin/login");
  }

  return <AdminShell username={username}>{children}</AdminShell>;
}
