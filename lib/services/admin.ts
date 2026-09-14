import { mockAdminDashboardStats, mockAdminUser, mockPlatformSettings } from "@/lib/mock/admin";
import { simulateDelay } from "@/lib/services/delay";
import type { AdminDashboardStats, AdminUser, PlatformSettings } from "@/types";

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await simulateDelay(500);
  return mockAdminDashboardStats;
}

export async function getCurrentAdmin(): Promise<AdminUser> {
  await simulateDelay(200);
  return mockAdminUser;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  await simulateDelay(300);
  return mockPlatformSettings;
}

/** Mock only: returns the submitted settings without persisting them. */
export async function updatePlatformSettings(settings: PlatformSettings): Promise<PlatformSettings> {
  await simulateDelay(700);
  if (settings.monthlyDataLimitGB < settings.dailyDataLimitGB) {
    throw new Error("Monthly data limit cannot be less than the daily data limit.");
  }
  return settings;
}
