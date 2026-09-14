"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileSchema, type UpdateProfileValues } from "@/lib/validation";
import { simulateDelay } from "@/lib/services/delay";
import type { User } from "@/types";

export function ProfileInfoForm({ user }: { user: User }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { username: user.username, email: user.email },
  });

  async function onSubmit(values: UpdateProfileValues) {
    await simulateDelay(700);
    toast.success("Profile updated");
    reset(values);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" disabled={isSubmitting} aria-invalid={!!errors.username} {...register("username")} />
          {errors.username ? <p className="text-xs text-destructive">{errors.username.message}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" disabled={isSubmitting} aria-invalid={!!errors.email} {...register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
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
