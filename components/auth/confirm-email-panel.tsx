"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmEmail } from "@/lib/services/auth";

export function ConfirmEmailPanel({
  tokenHash,
  type,
}: {
  tokenHash: string | null;
  type: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    tokenHash && type ? null : "This link is invalid or has expired.",
  );

  async function handleConfirm() {
    if (!tokenHash || !type) return;
    setLoading(true);
    setError(null);
    try {
      await confirmEmail(tokenHash, type as EmailOtpType);
      router.push(type === "recovery" ? "/reset-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This link is invalid or has expired.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="size-5 text-foreground" />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tap below to finish confirming your email address.
        </p>
      )}

      <Button size="lg" className="w-full" disabled={!tokenHash || !type || loading} onClick={handleConfirm}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Confirm email
      </Button>

      {error ? (
        <a href="/verify-email" className="text-xs text-muted-foreground underline underline-offset-4">
          Request a new link
        </a>
      ) : null}
    </div>
  );
}
