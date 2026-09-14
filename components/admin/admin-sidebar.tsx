"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { adminNavItems } from "@/components/admin/admin-nav-items";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-6">
        <span className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
          <ShieldCheck className="size-4" />
        </span>
        <span className="font-semibold text-zinc-100">MTN Vend Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {adminNavItems.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
              )}
            >
              <item.icon className={cn("size-4.5", active && "text-brand")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-3">
        <Link
          href="/admin/login"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
        >
          <LogOut className="size-4.5" />
          Logout
        </Link>
      </div>
    </aside>
  );
}
