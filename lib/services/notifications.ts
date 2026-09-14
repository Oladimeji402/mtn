import { CURRENT_USER_ID } from "@/lib/constants";
import { mockNotifications } from "@/lib/mock/notifications";
import { simulateDelay } from "@/lib/services/delay";
import type { Notification } from "@/types";

export async function getNotifications(): Promise<Notification[]> {
  await simulateDelay(400);
  return mockNotifications
    .filter((n) => n.userId === CURRENT_USER_ID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Mock only: returns the updated record without persisting it. */
export async function markNotificationRead(id: string): Promise<Notification | null> {
  await simulateDelay(200);
  const notification = mockNotifications.find((n) => n.id === id);
  if (!notification) return null;
  return { ...notification, read: true };
}
