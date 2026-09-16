import Link from "next/link";
import { History, Smartphone, User, Wifi } from "lucide-react";
import { cn, screenPadClass } from "@/lib/utils";

const tiles = [
  {
    href: "/dashboard/data",
    label: "Data",
    icon: Wifi,
    iconClassName: "bg-brand/20 text-brand-foreground",
  },
  {
    href: "/dashboard/transactions",
    label: "History",
    icon: History,
    iconClassName: "bg-info/10 text-info",
  },
  {
    href: "/dashboard/airtime",
    label: "Airtime",
    icon: Smartphone,
    iconClassName: "bg-success/10 text-success",
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: User,
    iconClassName: "bg-warning/10 text-warning",
  },
];

/** Phone/tablet shortcut row. Hidden from lg up, where the sidebar has these links. */
export function DashboardQuickActions() {
  return (
    <nav
      aria-label="Shortcuts"
      className={cn("grid grid-cols-4 gap-2 py-5 lg:hidden", screenPadClass)}
    >
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="flex flex-col items-center gap-2 rounded-xl py-1 transition-colors active:bg-secondary/60"
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl",
              tile.iconClassName,
            )}
          >
            <tile.icon className="size-6" />
          </span>
          <span className="text-xs font-medium">{tile.label}</span>
        </Link>
      ))}
    </nav>
  );
}
