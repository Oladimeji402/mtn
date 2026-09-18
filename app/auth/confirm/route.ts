import { type NextRequest, NextResponse } from "next/server";

/**
 * Landing point for links in Supabase Auth emails (signup confirmation and password
 * recovery). Deliberately does NOT verify the token here — this is a plain GET, and email
 * clients/security scanners routinely prefetch links automatically before the real user
 * clicks them. Since the token is single-use, that would silently consume it and the real
 * user would land on a false "expired" error a moment later, even though the account was
 * already verified by the scanner's hit. Instead this just forwards the token to a page
 * that requires an actual button click — see app/(auth)/verify-email/confirm/page.tsx and
 * lib/services/auth.ts's confirmEmail().
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/verify-email?error=1`);
  }

  const next = new URL(`${origin}/verify-email/confirm`);
  next.searchParams.set("token_hash", tokenHash);
  next.searchParams.set("type", type);
  return NextResponse.redirect(next);
}
