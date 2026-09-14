import { CURRENT_USER_ID, MIN_FUNDING_AMOUNT } from "@/lib/constants";
import { mockWallet, mockWalletHistory } from "@/lib/mock/wallet";
import { simulateDelay } from "@/lib/services/delay";
import type { Wallet, WalletTransaction } from "@/types";

export async function getWallet(): Promise<Wallet> {
  await simulateDelay(300);
  return mockWallet;
}

export async function getWalletHistory(): Promise<WalletTransaction[]> {
  await simulateDelay(500);
  return mockWalletHistory.filter((tx) => tx.userId === CURRENT_USER_ID);
}

export async function getWalletTransaction(id: string): Promise<WalletTransaction | null> {
  await simulateDelay(300);
  return mockWalletHistory.find((tx) => tx.id === id) ?? null;
}

export function getMinimumFundingAmount() {
  return MIN_FUNDING_AMOUNT;
}
