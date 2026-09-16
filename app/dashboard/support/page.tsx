import type { Metadata } from "next";
import { ArrowUpRight, Mail, MessageCircle, Phone } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";
import { formatPhoneNumber } from "@/lib/format";
import { cn, screenPanelClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Support" };

const faqs = [
  {
    q: "How long does wallet funding take?",
    a: "Usually within a minute. Pending items show in wallet history.",
  },
  {
    q: "What if my airtime or data doesn't arrive?",
    a: "Failed purchases are refunded automatically.",
  },
  {
    q: "Can I buy for a different number?",
    a: "Yes. You can buy for any MTN number.",
  },
  {
    q: "Is there a data purchase limit?",
    a: "Each purchase is capped at 5GB.",
  },
];

const internationalPhone = `+234${SUPPORT_PHONE.slice(1)}`;

const channels = [
  {
    label: "WhatsApp",
    description: "Chat with us",
    contact: formatPhoneNumber(SUPPORT_PHONE),
    href: `https://wa.me/${internationalPhone.replace("+", "")}`,
    icon: MessageCircle,
    iconClassName: "bg-success/10 text-success",
  },
  {
    label: "Call",
    description: "Speak with us",
    contact: formatPhoneNumber(SUPPORT_PHONE),
    href: `tel:${internationalPhone}`,
    icon: Phone,
    iconClassName: "bg-brand/15 text-brand-foreground",
  },
  {
    label: "Email",
    description: "Reply within a day",
    contact: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    icon: Mail,
    iconClassName: "bg-info/10 text-info",
  },
];

export default function SupportPage() {
  return (
    <div className="space-y-3 sm:space-y-6">
      <PageHeader title="Support" />

      <div className="divide-y border-y sm:grid sm:grid-cols-3 sm:gap-3 sm:divide-y-0 sm:border-0">
        {channels.map((channel) => (
          <a
            key={channel.label}
            href={channel.href}
            className="group flex min-h-[4.5rem] items-center gap-3 px-4 py-4 transition-colors active:bg-secondary/50 sm:min-h-[9.5rem] sm:flex-col sm:items-stretch sm:gap-3 sm:rounded-xl sm:border sm:bg-card sm:p-5 sm:hover:bg-secondary/40"
          >
            <div className="flex items-start justify-between sm:w-full">
              <span className={`flex size-11 items-center justify-center rounded-full sm:size-9 sm:rounded-md ${channel.iconClassName}`}>
                <channel.icon className="size-4.5" />
              </span>
              <ArrowUpRight className="hidden size-4 text-muted-foreground opacity-0 transition-opacity sm:block group-hover:opacity-100" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{channel.label}</p>
              <p className="text-sm text-muted-foreground">{channel.description}</p>
              <p className="mt-1 text-sm font-medium sm:mt-2">{channel.contact}</p>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground sm:hidden" />
          </a>
        ))}
      </div>

      <div className={cn("border-t sm:border", screenPanelClass)}>
        <p className="mb-4 font-medium">FAQ</p>
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
