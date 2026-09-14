import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start funding your wallet and buying MTN airtime & data."
    >
      <SignupForm />
    </AuthCard>
  );
}
