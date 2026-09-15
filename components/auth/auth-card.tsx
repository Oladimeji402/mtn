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
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="overflow-hidden rounded-2xl border shadow-sm">
          <div className="bg-gradient-to-br from-brand to-amber-500 px-6 pb-7 pt-8 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/95 text-lg font-bold text-foreground shadow-sm">
              B
            </span>
            <p className="mt-3 text-lg font-bold tracking-tight text-brand-foreground">
              {APP_NAME}
            </p>
            <p className="mt-1 text-sm text-brand-foreground/80">
              Buy MTN Airtime &amp; Data Easily
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
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

          <div className="bg-card p-6 sm:p-8">
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
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </div>
    </div>
  );
}
