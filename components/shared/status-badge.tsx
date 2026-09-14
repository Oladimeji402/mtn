import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus, TransactionStatus } from "@/types";
import {
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  XCircle,
  type LucideIcon,
} from "lucide-react";

const statusConfig: Record<
  TransactionStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  successful: {
    label: "Successful",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    className: "bg-info/10 text-info border-info/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  refunded: {
    label: "Refunded",
    icon: RotateCcw,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function TransactionStatusBadge({
  status,
  className,
}: {
  status: TransactionStatus;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-medium", config.className, className)}
    >
      <Icon className={cn("size-3.5", status === "processing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}

const paymentStatusLabel: Record<PaymentStatus, string> = {
  idle: "Idle",
  initiated: "Payment initiated",
  processing: "Processing payment",
  pending: "Payment pending",
  verifying: "Verifying payment",
  successful: "Payment successful",
  failed: "Payment failed",
  delayed: "Payment delayed",
};

export function paymentStatusText(status: PaymentStatus) {
  return paymentStatusLabel[status];
}

export function AccountStatusBadge({ status }: { status: "active" | "disabled" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        status === "active"
          ? "bg-success/10 text-success border-success/20"
          : "bg-muted text-muted-foreground border-border",
      )}
    >
      {status === "active" ? "Active" : "Disabled"}
    </Badge>
  );
}
