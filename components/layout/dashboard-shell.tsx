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
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader username={username} unreadCount={unreadCount} />
        <main className="flex-1 px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:pb-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
