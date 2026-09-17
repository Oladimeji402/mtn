"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/auth/password-input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { signupSchema, type SignupValues } from "@/lib/validation";
import { signUp } from "@/lib/services/auth";

export function SignupForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const password = watch("password") ?? "";

  async function onSubmit(values: SignupValues) {
    setSubmitError(null);
    try {
      await signUp(values);
      toast.success("Check your email to verify");
      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      method="post"
      className="w-full space-y-4 sm:mx-auto sm:w-[350px]"
      noValidate
    >
      {submitError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          placeholder="e.g. chinedu.k"
          autoComplete="username"
          disabled={isSubmitting}
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? "username-error" : undefined}
          className="h-12"
          {...register("username")}
        />
        {errors.username ? (
          <p id="username-error" className="text-xs text-destructive">
            {errors.username.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-12"
          {...register("email")}
        />
        {errors.email ? (
          <p id="email-error" className="text-xs text-destructive">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          placeholder="080X XXX XXXX"
          autoComplete="tel"
          disabled={isSubmitting}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
          className="h-12"
          {...register("phone")}
        />
        {errors.phone ? (
          <p id="phone-error" className="text-xs text-destructive">
            {errors.phone.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby="password-strength"
          className="h-12"
          {...register("password")}
        />
        <div id="password-strength">
          <PasswordStrength password={password} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          className="h-12"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p id="confirm-password-error" className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Controller
            name="agreeToTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="agreeToTerms"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isSubmitting}
                aria-invalid={!!errors.agreeToTerms}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="agreeToTerms" className="text-sm font-normal text-muted-foreground">
            I agree to the Terms &amp; Conditions and Privacy Policy
          </Label>
        </div>
        {errors.agreeToTerms ? (
          <p className="text-xs text-destructive">{errors.agreeToTerms.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="h-12 w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Create Account
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Login
        </Link>
      </p>
    </form>
  );
}
