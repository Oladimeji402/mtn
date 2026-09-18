"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { AlertCircle, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { confirmEmail } from "@/lib/services/auth";

type Status = "checking-hash" | "needs-click" | "invalid" | "confirming";

export function ConfirmEmailPanel({
  tokenHash,
  type,
}: {
  tokenHash: string | null;
  type: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>("checking-hash");
  const [error, setError] = React.useState<string | null>(null);

  // The default Supabase email template redirects here with the session in the URL's
  // #hash fragment (see app/auth/confirm/page.tsx's doc comment) rather than as query
  // params. The browser client's default detectSessionInUrl picks that up automatically
  // as soon as it's created — this just waits to see if a session shows up.
  React.useEffect(() => {
    if (!window.location.hash.includes("access_token")) {
      // Deferred to a microtask — window.location is only readable post-mount (never
      // during SSR), so this state transition can only happen from an effect, but
      // setting it synchronously at the top of the effect body risks a cascading
      // render; a microtask tick avoids that while still resolving before paint.
      Promise.resolve().then(() => setStatus(tokenHash && type ? "needs-click" : "invalid"));
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const linkType = hashParams.get("type");
    const destination = linkType === "recovery" ? "/reset-password" : "/dashboard";

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        subscription.unsubscribe();
        router.push(destination);
      }
    });

    // detectSessionInUrl usually resolves near-instantly, but fall back to an explicit
    // check in case the event already fired before this listener attached.
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        subscription.unsubscribe();
        router.push(destination);
      } else {
        subscription.unsubscribe();
        setStatus(tokenHash && type ? "needs-click" : "invalid");
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm() {
    if (!tokenHash || !type) return;
    setStatus("confirming");
    setError(null);
    try {
      await confirmEmail(tokenHash, type as EmailOtpType);
      router.push(type === "recovery" ? "/reset-password" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This link is invalid or has expired.");
      setStatus("invalid");
    }
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="size-5 text-foreground" />
      </div>

      {status === "checking-hash" ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Confirming your email...
        </p>
      ) : status === "invalid" ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-left text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error ?? "This link is invalid or has expired."}</span>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tap below to finish confirming your email address.
        </p>
      )}

      {status === "needs-click" || status === "confirming" ? (
        <Button
          size="lg"
          className="w-full"
          disabled={status === "confirming"}
          onClick={handleConfirm}
        >
          {status === "confirming" ? <Loader2 className="size-4 animate-spin" /> : null}
          Confirm email
        </Button>
      ) : null}

      {status === "invalid" ? (
        <a href="/verify-email" className="text-xs text-muted-foreground underline underline-offset-4">
          Request a new link
        </a>
      ) : null}
    </div>
  );
}
