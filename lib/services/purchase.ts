import { CURRENT_USER_ID } from "@/lib/constants";
import { mockDataPlans } from "@/lib/mock/data-plans";
import { simulateDelay } from "@/lib/services/delay";
import type { DataPlan, Transaction } from "@/types";

/**
 * Mock airtime/data purchase execution — still simulated pending a VTU provider
 * decision. Wallet funding is real now; see lib/actions/wallet.ts and lib/paystack.ts.
 */

function generateReference(prefix: string) {
  const stamp = Date.now().toString().slice(-8);
  return `${prefix}-${stamp}`;
}

export interface SubmitAirtimeInput {
  phoneNumber: string;
  amount: number;
  walletBalanceBefore: number;
}

export async function submitAirtimePurchase(input: SubmitAirtimeInput): Promise<Transaction> {
  await simulateDelay(1600);
  const now = new Date().toISOString();
  const reference = generateReference("TXN");
  return {
    id: reference.toLowerCase(),
    reference,
    userId: CURRENT_USER_ID,
    type: "airtime",
    network: "MTN",
    phoneNumber: input.phoneNumber,
    amount: input.amount,
    status: "successful",
    walletBalanceBefore: input.walletBalanceBefore,
    walletBalanceAfter: input.walletBalanceBefore - input.amount,
    createdAt: now,
    completedAt: now,
    providerReference: `VTU-${Math.floor(10000000 + Math.random() * 89999999)}`,
  };
}

export interface SubmitDataInput {
  phoneNumber: string;
  dataPlanId: string;
  walletBalanceBefore: number;
}

export async function submitDataPurchase(input: SubmitDataInput): Promise<Transaction> {
  await simulateDelay(1600);
  const plan = mockDataPlans.find((p) => p.id === input.dataPlanId) as DataPlan;
  const now = new Date().toISOString();
  const reference = generateReference("TXN");
  return {
    id: reference.toLowerCase(),
    reference,
    userId: CURRENT_USER_ID,
    type: "data",
    network: "MTN",
    phoneNumber: input.phoneNumber,
    amount: plan.price,
    dataPlan: { id: plan.id, size: plan.size, validityLabel: plan.validityLabel },
    status: "processing",
    statusMessage: "Data purchase is being processed.",
    walletBalanceBefore: input.walletBalanceBefore,
    walletBalanceAfter: input.walletBalanceBefore - plan.price,
    createdAt: now,
    completedAt: null,
    providerReference: `VTU-${Math.floor(10000000 + Math.random() * 89999999)}`,
  };
}
