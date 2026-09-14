"use client";

import * as React from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminMobileNavSheet } from "@/components/admin/admin-mobile-nav-sheet";

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader username={username} onOpenMobileNav={() => setNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <AdminMobileNavSheet open={navOpen} onOpenChange={setNavOpen} />
    </div>
  );
}
