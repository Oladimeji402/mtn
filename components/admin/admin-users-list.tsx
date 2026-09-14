"use client";

import * as React from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate, formatGB, formatNaira } from "@/lib/format";
import { setUserStatus } from "@/lib/services/users";
import { toast } from "sonner";
import type { AdminUserListItem } from "@/types";

type StatusFilter = "all" | "active" | "disabled";

export function AdminUsersList({ users: initialUsers }: { users: AdminUserListItem[] }) {
  const [users, setUsers] = React.useState(initialUsers);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("all");
  const [pendingUser, setPendingUser] = React.useState<AdminUserListItem | null>(null);
  const [loading, setLoading] = React.useState(false);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesStatus = status === "all" || u.status === status;
      const matchesSearch =
        query.length === 0 ||
        u.username.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [users, search, status]);

  async function handleConfirmToggle() {
    if (!pendingUser) return;
    setLoading(true);
    const nextStatus = pendingUser.status === "active" ? "disabled" : "active";
    try {
      await setUserStatus(pendingUser.id, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === pendingUser.id ? { ...u, status: nextStatus } : u)),
      );
      toast.success(`@${pendingUser.username} ${nextStatus === "active" ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setPendingUser(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username or email"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="disabled">Disabled</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="No users found" description="Try a different search term." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Wallet balance</TableHead>
                  <TableHead>Daily usage</TableHead>
                  <TableHead>Monthly usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">@{u.username}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                    <TableCell>{u.transactionCount}</TableCell>
                    <TableCell>{formatNaira(u.walletBalance, false)}</TableCell>
                    <TableCell>{formatGB(u.dailyUsageMB)}</TableCell>
                    <TableCell>{formatGB(u.monthlyUsageMB)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="text-xs font-medium hover:underline"
                        >
                          View
                        </Link>
                        <button
                          onClick={() => setPendingUser(u)}
                          className="text-xs font-medium text-destructive hover:underline"
                        >
                          {u.status === "active" ? "Disable" : "Enable"}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 sm:hidden">
            {filtered.map((u) => (
              <div key={u.id} className="rounded-lg border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">@{u.username}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <AccountStatusBadge status={u.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Wallet: {formatNaira(u.walletBalance, false)}</span>
                  <span>Txns: {u.transactionCount}</span>
                  <span>Daily: {formatGB(u.dailyUsageMB)}</span>
                  <span>Monthly: {formatGB(u.monthlyUsageMB)}</span>
                </div>
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/admin/users/${u.id}`}>View</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive"
                    onClick={() => setPendingUser(u)}
                  >
                    {u.status === "active" ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!pendingUser}
        onOpenChange={(open) => !open && setPendingUser(null)}
        title={pendingUser?.status === "active" ? "Disable this user?" : "Enable this user?"}
        description={
          pendingUser?.status === "active"
            ? `@${pendingUser?.username} will not be able to log in or make purchases while disabled.`
            : `@${pendingUser?.username} will regain access to their account.`
        }
        confirmLabel={pendingUser?.status === "active" ? "Disable user" : "Enable user"}
        destructive={pendingUser?.status === "active"}
        loading={loading}
        onConfirm={handleConfirmToggle}
      />
    </div>
  );
}
