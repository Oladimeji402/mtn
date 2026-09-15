import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { APP_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: `Admin Login | ${APP_NAME}` };

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-semibold text-zinc-100">{APP_NAME} Admin</p>
            <p className="text-sm text-zinc-400">Operations dashboard</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
