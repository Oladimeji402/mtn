"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usernameSchema } from "@/lib/validation";
import { updateOwnProfile } from "@/lib/services/profile";
import { z } from "zod";
import type { User } from "@/types";

const formSchema = z.object({ username: usernameSchema });
type FormValues = z.infer<typeof formSchema>;

export function ProfileInfoForm({ user }: { user: User }) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: user.username },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await updateOwnProfile(user.id, { username: values.username, phone: user.phone });
      toast.success("Profile updated");
      reset(values);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {submitError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            disabled={isSubmitting}
            aria-invalid={!!errors.username}
            {...register("username")}
          />
          {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email} disabled readOnly />
          <p className="text-xs text-muted-foreground">Contact support to change your email.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
