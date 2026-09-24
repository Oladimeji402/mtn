import * as React from "react";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

/**
 * One layout at every screen size: the phone design, centered in a wider column on large
 * screens (no sidebar, same header and bottom nav) rather than a separate desktop layout.
 */
export function DashboardShell({
  username,
  unreadCount,
  children,
}: {
  username: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh overflow-x-clip">
      <DashboardHeader username={username} unreadCount={unreadCount} />
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top)+0.75rem)]">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
