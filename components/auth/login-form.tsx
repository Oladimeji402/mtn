"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, House, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { loginSchema, type LoginValues } from "@/lib/validation";
import { logIn } from "@/lib/services/auth";

export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    setSubmitError(null);
    try {
      await logIn(values);
      toast.success("Welcome back");
      router.push(redirectTo);
      router.refresh();
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
        <Label htmlFor="identifier">Email or username</Label>
        <Input
          id="identifier"
          placeholder="you@example.com"
          autoComplete="username"
          disabled={isSubmitting}
          aria-invalid={!!errors.identifier}
          aria-describedby={errors.identifier ? "identifier-error" : undefined}
          className="h-12"
          {...register("identifier")}
        />
        {errors.identifier ? (
          <p id="identifier-error" className="text-xs text-destructive">
            {errors.identifier.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="inline-flex min-h-8 items-center text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="h-12"
          {...register("password")}
        />
        {errors.password ? (
          <p id="password-error" className="text-xs text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Login
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>

      <div className="border-t pt-4 text-center">
        <Link
          href="/landing"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <House className="size-3.5" />
          Visit our website
        </Link>
      </div>
    </form>
  );
}
