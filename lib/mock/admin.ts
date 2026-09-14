import type { AdminDashboardStats, AdminUser, PlatformSettings } from "@/types";

export const mockAdminUser: AdminUser = {
  id: "adm_1",
  username: "admin",
  email: "admin@example.com",
  role: "owner",
};

export const mockAdminDashboardStats: AdminDashboardStats = {
  totalUsers: 10,
  activeUsers: 8,
  transactionsToday: 6,
  successfulTransactions: 4,
  failedTransactions: 1,
  pendingTransactions: 1,
  airtimeSalesToday: 7700,
  dataSalesToday: 2050,
  walletFundingToday: 2000,
};

export const mockPlatformSettings: PlatformSettings = {
  dailyDataLimitGB: 5,
  monthlyDataLimitGB: 50,
  minimumFundingAmount: 100,
};

/** Synthetic per-user wallet balances for admin views, for users without a full wallet ledger. */
export const mockUserWalletBalances: Record<string, number> = {
  usr_1: 12500,
  usr_2: 7400,
  usr_3: 3400,
  usr_4: 1200,
  usr_5: 2500,
  usr_6: 0,
  usr_7: 5600,
  usr_8: 800,
  usr_9: 9200,
  usr_10: 10200,
};

/** Synthetic per-user data usage for admin views, for users without full usage tracking. */
export const mockUserUsage: Record<string, { dailyMB: number; monthlyMB: number }> = {
  usr_1: { dailyMB: 3200, monthlyMB: 18700 },
  usr_2: { dailyMB: 4600, monthlyMB: 31200 },
  usr_3: { dailyMB: 1100, monthlyMB: 9400 },
  usr_4: { dailyMB: 0, monthlyMB: 2100 },
  usr_5: { dailyMB: 5000, monthlyMB: 47500 },
  usr_6: { dailyMB: 200, monthlyMB: 800 },
  usr_7: { dailyMB: 2700, monthlyMB: 15300 },
  usr_8: { dailyMB: 0, monthlyMB: 600 },
  usr_9: { dailyMB: 3900, monthlyMB: 22100 },
  usr_10: { dailyMB: 4200, monthlyMB: 50000 },
};
