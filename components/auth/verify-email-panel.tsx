"use client";

import * as React from "react";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maskEmail } from "@/lib/format";
import { resendVerification } from "@/lib/services/auth";

const RESEND_SECONDS = 60;

export function VerifyEmailPanel({
  email,
  linkError,
}: {
  email: string | null;
  linkError?: boolean;
}) {
  const [countdown, setCountdown] = React.useState(RESEND_SECONDS);
  const [resending, setResending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    linkError ? "That link is invalid or has expired. Request a new one below." : null,
  );

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleResend() {
    if (!email) return;
    setError(null);
    setResending(true);
    try {
      await resendVerification(email);
      setCountdown(RESEND_SECONDS);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="size-5 text-foreground" />
      </div>

      <div className="space-y-1">
        <p className="font-medium">Verify your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">
            {email ? maskEmail(email) : "your email address"}
          </span>
          . Click the link to activate your account, then come back and login.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : sent ? (
        <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-left text-sm text-success">
          <MailCheck className="mt-0.5 size-4 shrink-0" />
          <span>Verification link resent.</span>
        </div>
      ) : null}

      <Button
        variant="outline"
        className="w-full"
        disabled={!email || countdown > 0 || resending}
        onClick={handleResend}
      >
        {resending ? <Loader2 className="size-4 animate-spin" /> : null}
        {countdown > 0 ? `Resend link in ${countdown}s` : "Resend verification link"}
      </Button>

      {!email ? (
        <p className="text-xs text-muted-foreground">
          Came here directly? Sign up again to get a fresh verification link.
        </p>
      ) : null}
    </div>
  );
}
