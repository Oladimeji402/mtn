import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" description="Login to manage your wallet and purchases.">
      <LoginForm />
    </AuthCard>
  );
}
