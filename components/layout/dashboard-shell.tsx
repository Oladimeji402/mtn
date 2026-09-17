import * as React from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

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
    <div className="flex min-h-dvh overflow-x-clip">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader username={username} unreadCount={unreadCount} />
        <main className="flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-[calc(3.5rem+env(safe-area-inset-top)+0.75rem)] sm:px-6 sm:pt-[calc(4rem+1.5rem)] lg:pb-8 lg:pt-6">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
