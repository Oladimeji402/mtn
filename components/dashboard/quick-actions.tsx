import Image from "next/image";
import Link from "next/link";
import { History, User, Wallet, type LucideIcon } from "lucide-react";
import { cn, screenPadClass } from "@/lib/utils";

type Tile = { href: string; label: string } & (
  | { logo: string }
  | { icon: LucideIcon; iconClassName: string }
);

const tiles: Tile[] = [
  {
    href: "/dashboard/data",
    label: "MTN Data",
    logo: "/mtn-logo.jpg",
  },
  {
    href: "/dashboard/wallet",
    label: "Wallet",
    icon: Wallet,
    iconClassName: "bg-success/10 text-success",
  },
  {
    href: "/dashboard/transactions",
    label: "History",
    icon: History,
    iconClassName: "bg-info/10 text-info",
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
      className={cn("grid grid-cols-4 gap-2 py-5", screenPadClass)}
    >
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="flex flex-col items-center gap-2 rounded-xl py-1 transition-colors active:bg-secondary/60"
        >
          {"logo" in tile ? (
            <Image
              src={tile.logo}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-2xl"
            />
          ) : (
            <span
              className={cn(
                "flex size-14 items-center justify-center rounded-2xl",
                tile.iconClassName,
              )}
            >
              <tile.icon className="size-6" />
            </span>
          )}
          <span className="text-xs font-medium">{tile.label}</span>
        </Link>
      ))}
    </nav>
  );
}
