import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  Smartphone,
  ShieldCheck,
  Gauge,
  Bell,
  BarChart3,
  CircleCheckBig,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNaira } from "@/lib/format";

const steps = [
  {
    title: "Create your account",
    description: "Sign up with a username, email and password in under a minute.",
  },
  {
    title: "Fund your wallet",
    description: "Add money to your wallet securely, then use it whenever you need to.",
  },
  {
    title: "Buy airtime or data",
    description: "Pick an amount or a data plan for any MTN number and confirm.",
  },
  {
    title: "Get delivered instantly",
    description: "Track the exact status of your purchase from processing to delivered.",
  },
];

const benefits = [
  {
    icon: Wallet,
    title: "One wallet, always ready",
    description: "Fund once and buy airtime or data anytime without re-entering payment details.",
  },
  {
    icon: Gauge,
    title: "Clear transaction status",
    description: "Every purchase shows pending, processing, successful or failed — never a guess.",
  },
  {
    icon: BarChart3,
    title: "Usage you can track",
    description: "See daily and monthly data usage against your limit at a glance.",
  },
  {
    icon: Bell,
    title: "Instant notifications",
    description: "Get notified the moment a purchase or wallet funding completes.",
  },
];

const trustPoints = [
  "Your wallet balance is never changed on this device alone — every credit and debit is verified.",
  "Every transaction gets a unique reference you can look up or share.",
  "Payment, wallet funding, and delivery are tracked as separate, visible steps.",
];

const faqs = [
  {
    q: "Which network does this support?",
    a: "This platform currently supports MTN airtime and data purchases only.",
  },
  {
    q: "How do I add money to my wallet?",
    a: "From your dashboard, choose Fund Wallet, pick or enter an amount, and complete payment. Your balance updates once payment is confirmed.",
  },
  {
    q: "What happens if a purchase fails?",
    a: "If a purchase can't be completed, any amount already deducted is refunded to your wallet and the transaction is marked failed or refunded.",
  },
  {
    q: "Can I see my past purchases?",
    a: "Yes. Your wallet history and transaction history both show a full record with status and reference numbers.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              MTN Airtime &amp; Data
            </span>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Buy MTN Airtime &amp; Data Easily
            </h1>
            <p className="max-w-lg text-base text-muted-foreground sm:text-lg">
              Fund your wallet once, then top up airtime or data for any MTN number in a
              few taps — with clear status at every step.
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
            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-md border bg-background p-3 text-sm">
                <Smartphone className="mb-2 size-4 text-muted-foreground" />
                Buy Airtime
              </div>
              <div className="rounded-md border bg-background p-3 text-sm">
                <Wallet className="mb-2 size-4 text-muted-foreground" />
                Buy Data
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MTN Data — 1GB</span>
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <CircleCheckBig className="size-3.5" /> Successful
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MTN Airtime — ₦500</span>
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <CircleCheckBig className="size-3.5" /> Successful
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-xl space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">How it works</h2>
          <p className="text-muted-foreground">
            Four simple steps from sign up to a completed purchase.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="space-y-2 rounded-lg border p-5">
              <span className="text-sm font-medium text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="benefits" className="border-y bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mb-10 max-w-xl space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Built for a simple, transparent purchase
            </h2>
            <p className="text-muted-foreground">
              Everything about your wallet and purchases is visible and easy to follow.
            </p>
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
              Built with trust and clarity in mind
            </h2>
            <p className="text-muted-foreground">
              Because this platform handles your money, every step — payment, wallet
              funding, and delivery — is shown separately so you always know what
              stage your transaction is at.
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
              Frequently asked questions
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
        <div className="flex flex-col items-center gap-6 rounded-xl border bg-card px-6 py-14 text-center">
          <h2 className="max-w-md text-2xl font-semibold tracking-tight sm:text-3xl">
            Fund your wallet and make your first purchase today
          </h2>
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
      </section>
    </>
  );
}
