"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resolveOrderAction } from "@/lib/actions/admin-orders";
import { GENERIC_ERROR_MESSAGE, errorText } from "@/lib/errors";

/** For an order stuck in "processing": the admin checked the real outcome and settles it. */
export function AdminResolveOrder({ purchaseId, size = "default" }: { purchaseId: string; size?: "default" | "sm" }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function resolve(outcome: "delivered" | "not_delivered") {
    setBusy(true);
    try {
      const res = await resolveOrderAction(purchaseId, outcome);
      if (!res.ok) {
        toast.error(errorText(res));
        return;
      }
      toast.success(outcome === "delivered" ? "Marked as delivered" : "Refunded the customer");
      router.refresh();
    } catch {
      toast.error(GENERIC_ERROR_MESSAGE);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size={size} variant="outline" disabled={busy}>
            The customer got the data
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as delivered?</AlertDialogTitle>
            <AlertDialogDescription>
              Only do this after checking that the data really arrived (the SIM&apos;s balance, or the provider&apos;s
              dashboard). The customer will not be refunded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolve("delivered")}>Yes, delivered</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size={size} variant="outline" disabled={busy}>
            The data did not arrive: refund
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Refund the customer?</AlertDialogTitle>
            <AlertDialogDescription>
              Only do this after checking that the data did NOT arrive. The customer&apos;s wallet is refunded, and any
              SIM allowance reserved for this order is given back. If the data did arrive, they would get it for free.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resolve("not_delivered")}>Yes, refund</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
