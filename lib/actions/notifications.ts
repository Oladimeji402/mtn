"use server";

import { markNotificationRead as markNotificationReadService } from "@/lib/services/notifications";

/** Server Action — the client-callable entry point for lib/services/notifications.ts. */
export async function markNotificationReadAction(id: string) {
  return markNotificationReadService(id);
}
