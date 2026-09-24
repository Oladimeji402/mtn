"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardHeader({
  username,
  unreadCount,
}: {
  username: string;
  unreadCount: number;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[calc(3.5rem+env(safe-area-inset-top))] bg-gradient-to-br from-brand to-amber-500 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        <p className="truncate text-base font-semibold text-white">Hi, {username}</p>

        <Button
          variant="ghost"
          size="icon"
          className="relative ml-auto size-11 text-white hover:bg-white/25 hover:text-white"
          asChild
        >
          <Link href="/dashboard/notifications" aria-label="Notifications">
            <Bell className="size-[19px]" />
            {unreadCount > 0 ? (
              <span className="absolute right-2 top-2 flex size-2 rounded-full bg-destructive" />
            ) : null}
          </Link>
        </Button>
      </div>
    </header>
  );
}
