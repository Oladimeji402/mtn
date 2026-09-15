import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/services/users";
import { getNotifications } from "@/lib/services/notifications";

// Authenticated, per-user data — never statically prerendered.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let username: string;
  let unreadCount: number;
  try {
    const [user, notifications] = await Promise.all([getCurrentUser(), getNotifications()]);
    username = user.username;
    unreadCount = notifications.filter((n) => !n.read).length;
  } catch {
    redirect("/login");
  }

  return (
    <DashboardShell username={username} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}
