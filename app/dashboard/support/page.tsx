import type { Metadata } from "next";
import { Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Support" };

const faqs = [
  {
    q: "How long does a wallet funding take to reflect?",
    a: "Most wallet funding is confirmed within a minute. If it takes longer, it will show as pending or delayed in your wallet history.",
  },
  {
    q: "What if my airtime or data doesn't arrive?",
    a: "If a purchase fails after your wallet was debited, the amount is automatically refunded and the transaction is marked as refunded.",
  },
  {
    q: "Can I change my registered phone number for purchases?",
    a: "Yes, you can enter any valid MTN number when buying airtime or data — it doesn't have to match your account.",
  },
  {
    q: "How do I know if my account has a daily or monthly data limit?",
    a: "Your current usage against the platform's daily and monthly limits is shown on your dashboard.",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Get help or find answers to common questions." />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-success/10">
            <MessageCircle className="size-4.5 text-success" />
          </div>
          <div>
            <p className="font-medium">WhatsApp Support</p>
            <p className="text-sm text-muted-foreground">Chat with us for quick help.</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">+234 000 000 0000 (placeholder)</p>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-info/10">
            <Mail className="size-4.5 text-info" />
          </div>
          <div>
            <p className="font-medium">Email Support</p>
            <p className="text-sm text-muted-foreground">We typically respond within a day.</p>
          </div>
          <p className="text-sm font-medium text-muted-foreground">support@example.com (placeholder)</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <p className="mb-4 font-medium">Frequently asked questions</p>
        <div className="divide-y">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-4 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium">
                {faq.q}
                <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
