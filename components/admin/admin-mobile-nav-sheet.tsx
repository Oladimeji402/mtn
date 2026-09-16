"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { adminNavItems } from "@/components/admin/admin-nav-items";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

export function AdminMobileNavSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 border-zinc-800 bg-zinc-950 p-0 pt-[env(safe-area-inset-top)] text-zinc-100">
        <SheetHeader className="border-b border-zinc-800">
          <SheetTitle className="flex items-center gap-2 text-zinc-100">
            <ShieldCheck className="size-4.5 text-brand" />
            {APP_NAME} Admin
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {adminNavItems.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                  active ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
                )}
              >
                <item.icon className={cn("size-4.5", active && "text-brand")} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/admin/login"
            onClick={() => onOpenChange(false)}
            className="mt-2 flex items-center gap-3 rounded-md border-t border-zinc-800 px-3 py-2.5 pt-4 text-sm font-medium text-zinc-400 hover:text-zinc-100"
          >
            <LogOut className="size-4.5" />
            Logout
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
