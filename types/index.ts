// Core domain types for the MTN Airtime & Data Vending Platform.
// These types model the data contracts the future backend (Supabase + Monipay + VTU provider)
// will eventually fulfil. The UI phase only consumes them via the mock service layer in lib/services.

export type Network = "MTN";

export type AccountStatus = "active" | "disabled";

/** Lifecycle shared by wallet funding entries, airtime purchases, and data purchases. */
export type TransactionStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "refunded";

/** Alias kept distinct for airtime/data purchase call sites, per the product's domain language. */
export type PurchaseStatus = TransactionStatus;

/** Status of the payment step only (wallet funding via the future payment gateway). */
export type PaymentStatus =
  | "idle"
  | "initiated"
  | "processing"
  | "pending"
  | "verifying"
  | "successful"
  | "failed"
  | "delayed";

export type WalletTransactionType =
  | "funding"
  | "airtime"
  | "data"
  | "refund"
  | "adjustment";

export type WalletTransactionDirection = "credit" | "debit";

export type PurchaseType = "airtime" | "data";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  status: AccountStatus;
  emailVerified: boolean;
  createdAt: string;
}

export interface Wallet {
  userId: string;
  balance: number;
  currency: "NGN";
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  reference: string;
  userId: string;
  type: WalletTransactionType;
  direction: WalletTransactionDirection;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: TransactionStatus;
  description: string;
  createdAt: string;
  /** Set when this wallet entry was produced by a purchase transaction. */
  relatedTransactionId?: string | null;
}

export interface DataPlan {
  id: string;
  network: Network;
  size: string;
  sizeInMB: number;
  validityDays: number;
  validityLabel: string;
  price: number;
  category: "daily" | "weekly" | "monthly";
  popular?: boolean;
  /** False when the plan can't be fulfilled right now (e.g. no SIM is online with room). */
  available?: boolean;
}

export interface TransactionDataPlanSummary {
  id: string;
  size: string;
  validityLabel: string;
}

export interface Transaction {
  id: string;
  reference: string;
  userId: string;
  type: PurchaseType;
  network: Network;
  phoneNumber: string;
  amount: number;
  dataPlan?: TransactionDataPlanSummary | null;
  status: PurchaseStatus;
  statusMessage?: string;
  walletBalanceBefore: number;
  walletBalanceAfter: number;
  createdAt: string;
  completedAt?: string | null;
  providerReference?: string | null;
  failureReason?: string | null;
}

export type NotificationType =
  | "airtime_success"
  | "airtime_failed"
  | "data_success"
  | "data_failed"
  | "wallet_funded"
  | "wallet_funding_failed"
  | "daily_limit_warning"
  | "monthly_limit_warning"
  | "security"
  | "vtu_balance_low"
  | "sme_balance_low"
  | "plan_price_drift"
  | "sim_pool_alert"
  | "order_needs_review";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface UsageWindow {
  usedMB: number;
}

export interface Usage {
  userId: string;
  daily: UsageWindow;
  monthly: UsageWindow;
  updatedAt: string;
}

export interface PurchaseRequest {
  type: PurchaseType;
  network: Network;
  phoneNumber: string;
  amount: number;
  dataPlanId?: string;
}

export interface WalletFundingRequest {
  amount: number;
}

export type AdminRole = "owner" | "admin" | "support";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
}

export interface AdminUserListItem extends User {
  walletBalance: number;
  transactionCount: number;
  dailyUsageMB: number;
  monthlyUsageMB: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  walletHistory: WalletTransaction[];
  transactions: Transaction[];
}

export interface AdminTransaction extends Transaction {
  username: string;
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeUsers: number;
  transactionsToday: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  dataSalesToday: number;
  walletFundingToday: number;
}

export interface PlatformSettings {
  minimumFundingAmount: number;
}
