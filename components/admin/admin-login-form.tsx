"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { adminLoginSchema, type AdminLoginValues } from "@/lib/validation";
import { adminLogIn } from "@/lib/services/auth";

export function AdminLoginForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  // Stays true through the redirect so the button keeps spinning instead of
  // going idle while the admin dashboard's server data is still loading.
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const busy = isSubmitting || isRedirecting;

  async function onSubmit(values: AdminLoginValues) {
    setSubmitError(null);
    try {
      await adminLogIn(values);
      toast.success("Welcome back");
      setIsRedirecting(true);
      router.push("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4 sm:mx-auto sm:w-[350px]" noValidate>
      {submitError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="identifier" className="text-zinc-300">
          Email or username
        </Label>
        <Input
          id="identifier"
          placeholder="admin@example.com"
          autoComplete="username"
          disabled={busy}
          aria-invalid={!!errors.identifier}
          className="h-12 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          {...register("identifier")}
        />
        {errors.identifier ? (
          <p className="text-xs text-destructive">{errors.identifier.message}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-zinc-300">
          Password
        </Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          disabled={busy}
          aria-invalid={!!errors.password}
          className="h-12 border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="h-12 w-full bg-brand text-base text-brand-foreground hover:bg-brand/90" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Login
      </Button>
    </form>
  );
}
