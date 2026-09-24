import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  ShieldCheck,
  Gauge,
  Bell,
  BarChart3,
  CircleCheckBig,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

const steps = [
  {
    title: "Create your account",
    description: "Sign up with email.",
  },
  {
    title: "Fund your wallet",
    description: "Pay with card.",
  },
  {
    title: "Buy data",
    description: "For any MTN number.",
  },
  {
    title: "Get it delivered",
    description: "Track until it arrives.",
  },
];

const benefits = [
  {
    icon: Wallet,
    title: "One wallet",
    description: "Fund once, buy anytime.",
  },
  {
    icon: Gauge,
    title: "Clear status",
    description: "See each purchase through.",
  },
  {
    icon: BarChart3,
    title: "MTN data",
    description: "Top up any MTN number anytime.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "When a purchase completes.",
  },
];

const trustPoints = [
  "Every credit and debit is verified.",
  "Every transaction has a unique reference.",
  "Payment, funding, and delivery are tracked separately.",
];

const faqs = [
  {
    q: "Which network does this support?",
    a: "MTN data only.",
  },
  {
    q: "How do I add money to my wallet?",
    a: "Use Fund Wallet and complete payment. Your balance updates when confirmed.",
  },
  {
    q: "What happens if a purchase fails?",
    a: "Any deducted amount is refunded to your wallet.",
  },
  {
    q: "Can I see my past purchases?",
    a: "Yes. Check wallet history and transactions.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              MTN Data
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Buy MTN Data
            </h1>
            <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
              Fund your wallet, then buy data for any MTN number.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Create Account
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Wallet balance</p>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                Active
              </span>
            </div>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {formatNaira(12500)}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2">
              <div className="rounded-md border bg-background p-3 text-sm">
                <Wifi className="mb-2 size-4 text-muted-foreground" />
                Buy Data
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MTN Data — 5GB</span>
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <CircleCheckBig className="size-3.5" /> Successful
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MTN Data — 5GB</span>
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <CircleCheckBig className="size-3.5" /> Successful
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            How it works
          </h2>
        </div>
        <ol className="space-y-8">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-4 pl-0">
              <div className="flex flex-col items-center">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                  {i + 1}
                </span>
                {i < steps.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div className="pb-2">
                <p className="font-medium">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="benefits" className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              What you get
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b) => (
              <div key={b.title} className="space-y-3 rounded-lg border bg-card p-5">
                <div className="flex size-9 items-center justify-center rounded-md bg-primary/15">
                  <b.icon className="size-4.5 text-foreground" />
                </div>
                <p className="font-medium">{b.title}</p>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary/15">
              <ShieldCheck className="size-5" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Secure and transparent
            </h2>
            <p className="text-muted-foreground">
              Every payment, funding, and delivery step is tracked.
            </p>
          </div>
          <ul className="space-y-4">
            {trustPoints.map((point) => (
              <li key={point} className="flex gap-3 rounded-lg border p-4">
                <CircleCheckBig className="mt-0.5 size-4.5 shrink-0 text-success" />
                <span className="text-sm text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="border-t bg-secondary/40">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              FAQ
            </h2>
          </div>
          <div className="divide-y rounded-lg border bg-card">
            {faqs.map((faq) => (
              <details key={faq.q} className="group p-5 open:pb-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
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
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-br from-brand to-amber-500 px-6 py-14 text-center">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-brand-foreground sm:text-3xl">
            Fund your wallet and buy today
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup">
                Create Account
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-brand-foreground/30 bg-transparent text-brand-foreground hover:bg-white/10"
              asChild
            >
              <Link href="/login">Login</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
