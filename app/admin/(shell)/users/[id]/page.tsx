import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AccountStatusBadge, TransactionStatusBadge } from "@/components/shared/status-badge";
import { WalletHistoryList } from "@/components/wallet/wallet-history-list";
import { EmptyState } from "@/components/shared/empty-state";
import { Receipt } from "lucide-react";
import { formatDate, formatDateTime, formatGB, formatNaira, formatPhoneNumber } from "@/lib/format";
import { getAdminUserDetail } from "@/lib/services/users";

export const metadata: Metadata = { title: "Admin User Details" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAdminUserDetail(id);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Users
      </Link>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold">@{user.username}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <AccountStatusBadge status={user.status} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          <Stat label="Wallet balance" value={formatNaira(user.walletBalance, false)} />
          <Stat label="Total transactions" value={String(user.transactionCount)} />
          <Stat label="Daily usage" value={formatGB(user.dailyUsageMB)} />
          <Stat label="Monthly usage" value={formatGB(user.monthlyUsageMB)} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Registered</p>
            <p className="font-medium">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p className="font-medium">{user.phone ? formatPhoneNumber(user.phone) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email verified</p>
            <p className="font-medium">{user.emailVerified ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <p className="font-medium">Transaction history</p>
        {user.transactions.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions yet" />
        ) : (
          <div className="space-y-2">
            {user.transactions.map((t) => (
              <Link
                key={t.id}
                href={`/admin/transactions/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3.5 hover:bg-secondary/40"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">
                    {t.type === "airtime" ? "MTN Airtime" : `MTN Data — ${t.dataPlan?.size ?? ""}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium">{formatNaira(t.amount, false)}</span>
                  <TransactionStatusBadge status={t.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <p className="font-medium">Wallet activity</p>
        <WalletHistoryList history={user.walletHistory} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
