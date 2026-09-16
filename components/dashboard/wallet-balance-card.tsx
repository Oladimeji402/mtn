"use client";

import Link from "next/link";
import { Eye, EyeOff, ShoppingCart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";
import { useLocalStorage } from "@/hooks/use-local-storage";

export function WalletBalanceCard({ balance }: { balance: number }) {
  const [visible, setVisible] = useLocalStorage("bunben-balance-visible", true);

  return (
    // Flush to the app bar on phones so the two read as one brand-coloured block.
    <div className="rounded-b-3xl bg-gradient-to-br from-brand to-amber-500 px-4 pb-5 pt-4 sm:rounded-2xl sm:p-5">
      <p className="text-xs font-medium text-brand-foreground/80">Available Balance</p>

      <div className="mt-1.5 flex items-center gap-2">
        <p className="text-[32px] font-bold leading-none tracking-tight text-brand-foreground sm:text-3xl">
          {visible ? formatNaira(balance) : "₦••••••••"}
        </p>
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          aria-label={visible ? "Hide balance" : "Show balance"}
          aria-pressed={visible}
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-brand-foreground/70 transition-colors hover:bg-white/25 hover:text-brand-foreground"
        >
          {visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-sm">
        <Button asChild size="lg" className="bg-white text-foreground shadow-sm hover:bg-white/90">
          <Link href="/dashboard/wallet">
            <Wallet className="size-4" />
            Fund Wallet
          </Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-brand-foreground/25 bg-white/15 text-brand-foreground hover:bg-white/25 hover:text-brand-foreground"
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
