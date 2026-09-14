"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSettingsSchema, type AdminSettingsValues } from "@/lib/validation";
import { updatePlatformSettings } from "@/lib/services/admin";
import type { PlatformSettings } from "@/types";

export function AdminSettingsForm({ settings }: { settings: PlatformSettings }) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AdminSettingsValues>({
    resolver: zodResolver(adminSettingsSchema),
    defaultValues: {
      dailyDataLimitGB: settings.dailyDataLimitGB,
      monthlyDataLimitGB: settings.monthlyDataLimitGB,
    },
  });

  async function onSubmit(values: AdminSettingsValues) {
    setSubmitError(null);
    try {
      const saved = await updatePlatformSettings({ ...settings, ...values });
      reset(saved);
      toast.success("Settings saved");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-xl border bg-card p-5 sm:p-6" noValidate>
      {submitError ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dailyDataLimitGB">Daily data limit (GB)</Label>
          <Input
            id="dailyDataLimitGB"
            type="number"
            disabled={isSubmitting}
            aria-invalid={!!errors.dailyDataLimitGB}
            {...register("dailyDataLimitGB")}
          />
          {errors.dailyDataLimitGB ? (
            <p className="text-xs text-destructive">{errors.dailyDataLimitGB.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyDataLimitGB">Monthly data limit (GB)</Label>
          <Input
            id="monthlyDataLimitGB"
            type="number"
            disabled={isSubmitting}
            aria-invalid={!!errors.monthlyDataLimitGB}
            {...register("monthlyDataLimitGB")}
          />
          {errors.monthlyDataLimitGB ? (
            <p className="text-xs text-destructive">{errors.monthlyDataLimitGB.message}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <p className="text-xs text-muted-foreground">
          {isDirty ? "You have unsaved changes" : "All changes saved"}
        </p>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
