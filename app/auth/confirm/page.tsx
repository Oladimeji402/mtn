import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ConfirmEmailPanel } from "@/components/auth/confirm-email-panel";

export const metadata: Metadata = {
  title: "Confirm Email",
};

/**
 * A real page, not a Route Handler — deliberately. Supabase Auth emails can arrive via two
 * different shapes depending on the email template:
 *
 * 1. The DEFAULT template (what this project uses until custom SMTP is set up — Supabase
 *    won't let template HTML be edited without it) links through Supabase's own hosted
 *    /auth/v1/verify endpoint, which verifies the token on Supabase's server and redirects
 *    here with the session in the URL's #hash fragment. A hash fragment is never sent to
 *    any server — only client-side JS can read it — so a server Route Handler here could
 *    never see it, for anyone, regardless of prefetching. ConfirmEmailPanel handles this by
 *    letting the browser Supabase client's default `detectSessionInUrl` pick it up.
 * 2. A CUSTOM template using {{ .TokenHash }} directly (the fix for the separate
 *    prefetch-consumption problem, once custom SMTP is set up) links here with
 *    token_hash/type as query params instead, which ConfirmEmailPanel also handles.
 */
export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: tokenHash, type } = await searchParams;

  return (
    <AuthCard title="Confirm your email">
      <ConfirmEmailPanel tokenHash={tokenHash ?? null} type={type ?? null} />
    </AuthCard>
  );
}
