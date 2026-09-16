import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Admin Login | ${APP_NAME}` };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 px-6 py-[max(3rem,env(safe-area-inset-top))] sm:items-center sm:justify-center sm:px-4 sm:py-12">
      <div className="flex w-full flex-1 flex-col justify-center space-y-6 sm:max-w-[414px] sm:flex-none">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-zinc-100">{APP_NAME} Admin</p>
            <p className="text-sm text-zinc-400">Operations dashboard</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:rounded-xl">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
