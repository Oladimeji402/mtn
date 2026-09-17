"use server";

import { setUserStatus as setUserStatusService } from "@/lib/services/users";
import type { User } from "@/types";

/** Server Actions — the client-callable entry points for admin mutations. */

export async function setUserStatusAction(id: string, status: User["status"]) {
  return setUserStatusService(id, status);
}
