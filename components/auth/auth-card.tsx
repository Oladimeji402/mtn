import { Logo } from "@/components/layout/logo";

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
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <div className="px-4 py-6 sm:px-6">
        <Logo />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 space-y-1.5">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
          {footer ? (
            <p className="text-center text-sm text-muted-foreground">{footer}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
