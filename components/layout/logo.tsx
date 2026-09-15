import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

// Placeholder mark until the client sends their logo — swap the span below for an
// <Image> once it's provided.
export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-brand text-[13px] font-bold text-brand-foreground">
        B
      </span>
      <span>{APP_NAME}</span>
    </Link>
  );
}
