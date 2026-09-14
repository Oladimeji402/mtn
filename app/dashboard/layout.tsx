import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getCurrentUser } from "@/lib/services/users";
import { getNotifications } from "@/lib/services/notifications";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, notifications] = await Promise.all([getCurrentUser(), getNotifications()]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardShell username={user.username} unreadCount={unreadCount}>
      {children}
    </DashboardShell>
  );
}
