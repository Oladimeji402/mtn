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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { markNotificationRead } from "@/lib/services/notifications";
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
};

export function NotificationList({ notifications }: { notifications: Notification[] }) {
  const [items, setItems] = React.useState(notifications);
  const unreadCount = items.filter((n) => !n.read).length;

  async function handleMarkRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  }

  function handleMarkAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="We'll let you know when something happens on your account."
      />
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="gap-1.5 text-xs">
            <CheckCheck className="size-3.5" />
            Mark all as read
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {items.map((n) => {
          const config = notificationIcon[n.type];
          const Icon = config.icon;
          return (
            <button
              key={n.id}
              onClick={() => handleMarkRead(n.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-colors",
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
