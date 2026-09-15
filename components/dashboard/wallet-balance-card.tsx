"use client";

import Link from "next/link";
import { Eye, EyeOff, Smartphone, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { useLocalStorage } from "@/hooks/use-local-storage";

const quickActions = [
  {
    href: "/dashboard/airtime",
    label: "Buy Airtime",
    icon: Smartphone,
    iconClassName: "bg-brand/15 text-brand-foreground",
  },
  {
    href: "/dashboard/data",
    label: "Buy Data",
    icon: Wifi,
    iconClassName: "bg-info/10 text-info",
  },
];

export function WalletBalanceCard({ balance }: { balance: number }) {
  const [visible, setVisible] = useLocalStorage("bunben-balance-visible", true);

  return (
    <div className="rounded-2xl bg-secondary/60 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Wallet Balance</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[28px] font-bold leading-none tracking-tight sm:text-3xl">
              {visible ? formatNaira(balance) : "₦••••••••"}
            </p>
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              aria-label={visible ? "Hide balance" : "Show balance"}
              aria-pressed={visible}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
            >
              {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        </div>
        <Button asChild size="sm" className="h-9 shrink-0 rounded-full px-4">
          <Link href="/dashboard/wallet">Fund Wallet</Link>
        </Button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex items-center gap-2.5 rounded-xl bg-background px-3 py-2.5 transition-colors active:bg-background/70"
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${action.iconClassName}`}
            >
              <action.icon className="size-4" />
            </span>
            <span className="text-sm font-medium">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
