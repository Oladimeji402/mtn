"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CircleCheckBig, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { maskEmail } from "@/lib/format";
import { mockResendVerification, mockVerifyEmail } from "@/lib/services/auth";

const RESEND_SECONDS = 60;

export function VerifyEmailPanel({ email }: { email: string | null }) {
  const [countdown, setCountdown] = React.useState(RESEND_SECONDS);
  const [resending, setResending] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(c - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      await mockResendVerification();
      setCountdown(RESEND_SECONDS);
    } catch {
      setError("Couldn't resend the email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleSimulateVerify() {
    setError(null);
    setVerifying(true);
    try {
      await mockVerifyEmail();
      setVerified(true);
    } catch {
      setError("We couldn't verify your email. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (verified) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-success/10">
          <CircleCheckBig className="size-5 text-success" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Email verified</p>
          <p className="text-sm text-muted-foreground">
            Your account is ready. You can now login and start using your wallet.
          </p>
        </div>
        <Button className="w-full" asChild>
          <Link href="/login">Continue to login</Link>
        </Button>
      </div>
    );
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
          . Click the link to activate your account.
        </p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={countdown > 0 || resending}
          onClick={handleResend}
        >
          {resending ? <Loader2 className="size-4 animate-spin" /> : null}
          {countdown > 0 ? `Resend link in ${countdown}s` : "Resend verification link"}
        </Button>
      </div>

      <div className="space-y-2 border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Preview mode — no email was actually sent.
        </p>
        <Button variant="secondary" className="w-full" onClick={handleSimulateVerify} disabled={verifying}>
          {verifying ? <Loader2 className="size-4 animate-spin" /> : null}
          Simulate clicking the verification link
        </Button>
      </div>
    </div>
  );
}
