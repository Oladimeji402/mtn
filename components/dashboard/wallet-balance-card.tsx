"use client";

import Link from "next/link";
import { Eye, EyeOff, ShoppingCart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function WalletBalanceCard({ balance }: { balance: number }) {
  const [visible, setVisible] = useLocalStorage("bunben-balance-visible", true);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand to-amber-500 p-5 shadow-sm">
      <p className="text-xs font-medium text-white/90">Available Balance</p>

      <div className="mt-1.5 flex items-center gap-2">
        <p className="text-[32px] font-bold leading-none tracking-tight text-white sm:text-3xl">
          {visible ? formatNaira(balance) : "₦••••••••"}
        </p>
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide balance" : "Show balance"}
          aria-pressed={visible}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/25 hover:text-white"
        >
          {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
        <Button asChild size="lg" className="bg-white text-amber-500 shadow-sm hover:bg-white/90 hover:text-amber-500">
          <Link href="/dashboard/wallet">
            <Wallet className="size-4" />
            Fund Wallet
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-2 border-white bg-transparent text-white hover:bg-white/20 hover:text-white dark:bg-transparent dark:hover:bg-white/20"
        >
          <Link href="/dashboard/data">
            <ShoppingCart className="size-4" />
            Buy Data
          </Link>
        </Button>
      </div>
    </div>
  );
}
