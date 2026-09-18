import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { ConfirmEmailPanel } from "@/components/auth/confirm-email-panel";

export const metadata: Metadata = {
  title: "Confirm Email",
};

export default async function ConfirmEmailPage({
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
