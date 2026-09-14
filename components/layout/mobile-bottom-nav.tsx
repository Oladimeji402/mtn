"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobilePrimaryNavItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {mobilePrimaryNavItems.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5"
          >
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full transition-colors",
                active && "bg-brand/15",
              )}
            >
              <item.icon
                className={cn("size-[19px]", active ? "text-brand-foreground" : "text-muted-foreground")}
                strokeWidth={active ? 2.25 : 1.75}
              />
            </span>
            <span
              className={cn(
                "text-[10.5px] leading-none",
                active ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
