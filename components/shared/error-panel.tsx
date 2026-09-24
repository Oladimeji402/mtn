"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GENERIC_ERROR_MESSAGE } from "@/lib/errors";

/** Shown by the error boundaries — generic wording plus the reference support can look up. */
export function ErrorPanel({
  digest,
  onRetry,
  homeHref,
}: {
  digest?: string;
  onRetry: () => void;
  homeHref: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{GENERIC_ERROR_MESSAGE}</p>
      {digest ? <p className="text-xs text-muted-foreground">Reference: {digest}</p> : null}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={onRetry}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href={homeHref}>Go home</Link>
        </Button>
      </div>
    </div>
  );
}
