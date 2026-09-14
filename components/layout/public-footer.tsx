import Link from "next/link";
import { Logo } from "@/components/layout/logo";

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Buy MTN airtime and data from your wallet in seconds.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Product</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#how-it-works" className="hover:text-foreground">How it works</a></li>
                <li><a href="#faq" className="hover:text-foreground">FAQ</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Account</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-foreground">Login</Link></li>
                <li><Link href="/signup" className="hover:text-foreground">Create account</Link></li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Support</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard/support" className="hover:text-foreground">Help centre</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} MTN Vend. All rights reserved.</p>
          <p>MTN Vend is an independent airtime and data reseller and is not affiliated with MTN Nigeria.</p>
        </div>
      </div>
    </footer>
  );
}
