import { CURRENT_USER_ID } from "@/lib/constants";
import { mockAllTransactions, mockCustomerTransactions } from "@/lib/mock/transactions";
import { mockUsers } from "@/lib/mock/users";
import { simulateDelay } from "@/lib/services/delay";
import type { AdminTransaction, Transaction } from "@/types";

export async function getTransactions(): Promise<Transaction[]> {
  await simulateDelay(500);
  return [...mockCustomerTransactions]
    .filter((t) => t.userId === CURRENT_USER_ID)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTransaction(id: string): Promise<Transaction | null> {
  await simulateDelay(300);
  return mockAllTransactions.find((t) => t.id === id) ?? null;
}

export async function getAdminTransactions(): Promise<AdminTransaction[]> {
  await simulateDelay(500);
  return mockAllTransactions.map((t) => ({
    ...t,
    username: mockUsers.find((u) => u.id === t.userId)?.username ?? "unknown",
  }));
}

export async function getAdminTransaction(id: string): Promise<AdminTransaction | null> {
  await simulateDelay(300);
  const t = mockAllTransactions.find((tx) => tx.id === id);
  if (!t) return null;
  return { ...t, username: mockUsers.find((u) => u.id === t.userId)?.username ?? "unknown" };
}
