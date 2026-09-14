import { CURRENT_USER_ID } from "@/lib/constants";
import { mockDataPlans } from "@/lib/mock/data-plans";
import { simulateDelay } from "@/lib/services/delay";
import type { DataPlan, Transaction, WalletTransaction } from "@/types";

/**
 * Mock purchase + wallet funding execution. Simulates the latency of a real
 * wallet-debit → VTU-provider round trip. No balance is actually persisted —
 * callers hold the resulting balance in local component state for this UI phase.
 *
 * The future backend owns balance checks, idempotency, and provider fulfilment;
 * this file only stands in for that round trip so the UI has real states to render.
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
    statusMessage: "Your MTN data purchase is being processed.",
    walletBalanceBefore: input.walletBalanceBefore,
    walletBalanceAfter: input.walletBalanceBefore - plan.price,
    createdAt: now,
    completedAt: null,
    providerReference: `VTU-${Math.floor(10000000 + Math.random() * 89999999)}`,
  };
}

export interface SubmitFundingInput {
  amount: number;
  walletBalanceBefore: number;
}

export async function submitWalletFunding(input: SubmitFundingInput): Promise<WalletTransaction> {
  await simulateDelay(1800);
  const now = new Date().toISOString();
  const reference = generateReference("FUND");
  return {
    id: reference.toLowerCase(),
    reference,
    userId: CURRENT_USER_ID,
    type: "funding",
    direction: "credit",
    amount: input.amount,
    balanceBefore: input.walletBalanceBefore,
    balanceAfter: input.walletBalanceBefore + input.amount,
    status: "successful",
    description: "Wallet funding via card",
    createdAt: now,
  };
}
