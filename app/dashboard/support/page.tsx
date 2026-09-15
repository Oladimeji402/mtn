import type { Metadata } from "next";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";
import { formatPhoneNumber } from "@/lib/format";

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
    q: "Is there a limit on how much data I can buy?",
    a: "Each data purchase is capped at 5GB. There's no limit on the number of purchases — buy as many 5GB (or smaller) plans as you need.",
  },
];

const internationalPhone = `+234${SUPPORT_PHONE.slice(1)}`;

const channels = [
  {
    label: "WhatsApp Support",
    description: "Chat with us for quick help.",
    contact: formatPhoneNumber(SUPPORT_PHONE),
    href: `https://wa.me/${internationalPhone.replace("+", "")}`,
    icon: MessageCircle,
    iconClassName: "bg-success/10 text-success",
  },
  {
    label: "Call Support",
    description: "Speak with our support team.",
    contact: formatPhoneNumber(SUPPORT_PHONE),
    href: `tel:${internationalPhone}`,
    icon: Phone,
    iconClassName: "bg-brand/15 text-brand-foreground",
  },
  {
    label: "Email Support",
    description: "We typically respond within a day.",
    contact: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: Mail,
    iconClassName: "bg-info/10 text-info",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Get help or find answers to common questions." />

      <div className="grid gap-3 sm:grid-cols-3">
        {channels.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-start justify-between">
              <span className={`flex size-9 items-center justify-center rounded-md ${channel.iconClassName}`}>
                <channel.icon className="size-4.5" />
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div>
              <p className="font-medium">{channel.label}</p>
              <p className="text-sm text-muted-foreground">{channel.description}</p>
            </div>
            <p className="text-sm font-medium">{channel.contact}</p>
          </a>
        ))}
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
