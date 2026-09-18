"use client";

import * as React from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleCheckBig,
  ShieldAlert,
  Wallet,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/format";
import { cn, screenPadClass } from "@/lib/utils";
import { markNotificationReadAction } from "@/lib/actions/notifications";
import type { Notification, NotificationType } from "@/types";

const notificationIcon: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  airtime_success: { icon: CircleCheckBig, className: "bg-success/10 text-success" },
  data_success: { icon: CircleCheckBig, className: "bg-success/10 text-success" },
  airtime_failed: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  data_failed: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  wallet_funded: { icon: Wallet, className: "bg-success/10 text-success" },
  wallet_funding_failed: { icon: XCircle, className: "bg-destructive/10 text-destructive" },
  daily_limit_warning: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  monthly_limit_warning: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  security: { icon: ShieldAlert, className: "bg-info/10 text-info" },
  vtu_balance_low: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  sme_balance_low: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
  plan_price_drift: { icon: AlertTriangle, className: "bg-warning/10 text-warning" },
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = React.useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    const wasRead = items.find((n) => n.id === id)?.read ?? false;
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationReadAction(id);
    } catch {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: wasRead } : n)));
      toast.error("Could not update");
    }
  }

  async function handleMarkAllRead() {
    const unread = items.filter((n) => !n.read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await Promise.all(unread.map((id) => markNotificationReadAction(id)));
      toast.success("Marked as read");
    } catch {
      setItems((prev) => prev.map((n) => (unread.includes(n.id) ? { ...n, read: false } : n)));
      toast.error("Could not update");
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="You're all caught up."
        className="mx-4 sm:mx-0"
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {unreadCount > 0 ? (
        <div className={cn("flex justify-end", screenPadClass)}>
          <Button variant="ghost" className="h-11 gap-1.5 text-sm sm:h-7 sm:text-xs" onClick={handleMarkAllRead}>
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        </div>
      ) : null}

      <div className="divide-y border-y sm:space-y-2 sm:divide-y-0 sm:border-0">
        {items.map((n) => {
          const config = notificationIcon[n.type];
          const Icon = config.icon;
          return (
            <button
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={cn(
                "flex min-h-16 w-full items-start gap-3 px-4 py-4 text-left transition-colors active:bg-secondary/50 sm:rounded-xl sm:border sm:p-4",
                !n.read && "bg-secondary/40",
              )}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", config.className)}>
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                  {!n.read ? <span className="mt-1 size-2 shrink-0 rounded-full bg-destructive" /> : null}
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
