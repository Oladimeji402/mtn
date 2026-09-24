import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { screenPadClass } from "@/lib/utils";

export function ServicesCard() {
  return (
    <div className={`border-t py-5 sm:rounded-xl sm:border sm:p-6 ${screenPadClass}`}>
      <p className="mb-3 text-sm font-medium">Services</p>
      <Link
        href="/dashboard/data"
        className="flex items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary/40 active:bg-secondary/60"
      >
        <Image src="/mtn-logo.jpg" alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">MTN Data</span>
          <span className="block text-xs text-muted-foreground">Best prices, instant delivery</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  );
}
