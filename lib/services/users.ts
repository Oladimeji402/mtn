import { CURRENT_USER_ID } from "@/lib/constants";
import { mockUserUsage, mockUserWalletBalances } from "@/lib/mock/admin";
import { mockAllTransactions } from "@/lib/mock/transactions";
import { mockUsers } from "@/lib/mock/users";
import { mockWalletHistory } from "@/lib/mock/wallet";
import { simulateDelay } from "@/lib/services/delay";
import type { AdminUserDetail, AdminUserListItem, User } from "@/types";

/**
 * Mock user service. In production this reads from Supabase, scoped by the
 * authenticated session — never a client-supplied user id.
 */

export async function getCurrentUser(): Promise<User> {
  await simulateDelay(300);
  const user = mockUsers.find((u) => u.id === CURRENT_USER_ID);
  if (!user) throw new Error("Current user not found");
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  await simulateDelay(300);
  return mockUsers.find((u) => u.id === id) ?? null;
}

function toAdminListItem(user: User): AdminUserListItem {
  return {
    ...user,
    walletBalance: mockUserWalletBalances[user.id] ?? 0,
    transactionCount: mockAllTransactions.filter((t) => t.userId === user.id).length,
    dailyUsageMB: mockUserUsage[user.id]?.dailyMB ?? 0,
    monthlyUsageMB: mockUserUsage[user.id]?.monthlyMB ?? 0,
  };
}

export async function getUsers(): Promise<AdminUserListItem[]> {
  await simulateDelay(500);
  return mockUsers.map(toAdminListItem);
}

export async function getAdminUserDetail(id: string): Promise<AdminUserDetail | null> {
  await simulateDelay(500);
  const user = mockUsers.find((u) => u.id === id);
  if (!user) return null;

  const transactions = mockAllTransactions
    .filter((t) => t.userId === id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const walletHistory =
    id === CURRENT_USER_ID
      ? mockWalletHistory
      : transactions
          .filter((t) => t.status !== "pending")
          .map((t) => ({
            id: `wtx_${t.id}`,
            reference: t.reference,
            userId: t.userId,
            type: t.type,
            direction: "debit" as const,
            amount: t.amount,
            balanceBefore: t.walletBalanceBefore,
            balanceAfter: t.walletBalanceAfter,
            status: t.status,
            description: t.type === "airtime" ? "MTN Airtime" : `MTN Data — ${t.dataPlan?.size ?? ""}`,
            createdAt: t.createdAt,
            relatedTransactionId: t.id,
          }));

  return {
    ...toAdminListItem(user),
    walletHistory,
    transactions,
  };
}

/**
 * Mock only: returns the updated record without persisting it. The calling
 * component updates its own local state; the real backend will own this write.
 */
export async function setUserStatus(id: string, status: User["status"]): Promise<User> {
  await simulateDelay(600);
  const user = mockUsers.find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  return { ...user, status };
}
