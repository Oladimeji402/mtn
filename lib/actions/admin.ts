"use server";

import { setUserStatus as setUserStatusService } from "@/lib/services/users";
import { updatePlatformSettings as updatePlatformSettingsService } from "@/lib/services/admin";
import type { PlatformSettings, User } from "@/types";

/** Server Actions — the client-callable entry points for admin mutations. */

export async function setUserStatusAction(id: string, status: User["status"]) {
  return setUserStatusService(id, status);
}

export async function updatePlatformSettingsAction(settings: PlatformSettings) {
  return updatePlatformSettingsService(settings);
}
