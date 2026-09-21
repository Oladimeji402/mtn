import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Drop-in stand-in for a lucide icon (same className sizing) that renders the MTN logo.
 * Accepts and ignores strokeWidth so nav code written for icon components can pass it through.
 */
export function MtnLogoIcon({ className }: { className?: string; strokeWidth?: number }) {
  return (
    <Image
      src="/mtn-logo.jpg"
      alt=""
      width={40}
      height={40}
      className={cn("rounded-md object-cover", className)}
    />
  );
}
