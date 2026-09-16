import { ShieldCheck, Headset, Zap } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const badges = [
  { icon: Zap, label: "Instant Delivery" },
  { icon: ShieldCheck, label: "Secure" },
  { icon: Headset, label: "24/7 Support" },
];

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-card sm:items-center sm:justify-center sm:bg-secondary/30 sm:px-4 sm:py-10">
      <div className="flex w-full flex-1 flex-col sm:max-w-[416px] sm:flex-none sm:space-y-4">
        <div className="flex flex-1 flex-col sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-sm">
          <div className="bg-gradient-to-br from-brand to-amber-500 px-6 pb-7 pt-[max(2rem,env(safe-area-inset-top))] text-center sm:pt-8">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/95 text-lg font-bold text-foreground shadow-sm">
              B
            </span>
            <p className="mt-3 text-lg font-bold tracking-tight text-brand-foreground">
              {APP_NAME}
            </p>
            <p className="mt-1 text-sm text-brand-foreground/80">
              Buy MTN Airtime &amp; Data
            </p>
            <div className="mt-4 hidden flex-wrap items-center justify-center gap-2 sm:flex">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/25 px-3 py-1 text-xs font-medium text-brand-foreground"
                >
                  <b.icon className="size-3.5" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-1 flex-col bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
        {footer ? (
          <p className="px-6 pb-6 text-center text-sm text-muted-foreground sm:px-0 sm:pb-0">
            {footer}
          </p>
        ) : null}
      </div>
    </div>
  );
}
