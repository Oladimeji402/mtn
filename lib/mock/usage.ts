import type { Usage } from "@/types";

export const mockUsage: Usage = {
  userId: "usr_1",
  daily: { usedMB: 3200, limitMB: 5000 },
  monthly: { usedMB: 18700, limitMB: 50000 },
  updatedAt: "2026-09-14T09:00:00.000Z",
};
