import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { NotificationList } from "@/components/notifications/notification-list";
import { getNotifications } from "@/lib/services/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Notifications" />
      <NotificationList notifications={notifications} />
    </div>
  );
}
