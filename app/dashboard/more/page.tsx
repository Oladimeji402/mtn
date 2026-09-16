"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronRight,
  LifeBuoy,
  LogOut,
  Receipt,
  User,
  Wallet,
} from "lucide-react";
import { signOut } from "@/lib/services/auth";
import { PageHeader } from "@/components/shared/page-header";
import { cn, screenPanelClass } from "@/lib/utils";

const menuItems = [
  {
    label: "Wallet",
    description: "View balance & fund wallet",
    href: "/dashboard/wallet",
    icon: Wallet,
    iconClass: "bg-purple-100 text-purple-600",
  },
  {
    label: "Transactions",
    description: "Your purchase history",
    href: "/dashboard/transactions",
    icon: Receipt,
    iconClass: "bg-blue-100 text-blue-600",
  },
  {
    label: "Notifications",
    description: "Alerts & updates",
    href: "/dashboard/notifications",
    icon: Bell,
    iconClass: "bg-amber-100 text-amber-600",
  },
  {
    label: "Profile",
    description: "Edit personal information",
    href: "/dashboard/profile",
    icon: User,
    iconClass: "bg-indigo-100 text-indigo-600",
  },
  {
    label: "Support",
    description: "Get help & contact us",
    href: "/dashboard/support",
    icon: LifeBuoy,
    iconClass: "bg-green-100 text-green-600",
  },
];

export default function MorePage() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-0 sm:space-y-6">
      <div className="mb-3 sm:mb-0">
        <PageHeader title="More" />
      </div>

      {/* Menu links */}
      <section className={cn(screenPanelClass, "p-0 sm:p-0")}>
        <ul className="divide-y">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    item.iconClass,
                  )}
                >
                  <item.icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Logout */}
      <section className={cn(screenPanelClass, "p-0 sm:p-0")}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 active:bg-muted"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <LogOut className="size-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-medium text-red-600">Log Out</span>
            <span className="block text-xs text-muted-foreground">Sign out of your account</span>
          </span>
        </button>
      </section>
    </div>
  );
}
