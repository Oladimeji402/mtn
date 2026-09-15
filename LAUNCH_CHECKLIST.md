# Bunben Data Hub — Launch Checklist & Handoff

Last updated: 2026-09-15. Written so a fresh Claude Code session (or anyone else) can pick this
up cold — read this file first, then the codebase.

## Status at a glance

**Real and working right now** (verified live, not just "looks done"):
- Supabase Auth end-to-end: signup, login (email or username), password reset, email
  verification, admin login
- Full Postgres schema with RLS (`supabase/migrations/`, 8 migrations, all applied)
- Wallet funding via Paystack Inline — real money flow, webhook + client-confirm paths,
  tested end-to-end including a bug fix (see "Known gotchas" below)
- All reads (wallet, transactions, notifications, data plans, usage) — real Supabase data
- Admin: enable/disable users, configurable per-purchase data cap
- PWA install banner, manifest, generated placeholder icons
- Deployed at https://mtn-neon-six.vercel.app (Vercel project `bellosulaimons-projects/mtn`,
  now connected to GitHub `Oladimeji402/mtn` for auto-deploy on push to `main`)

**Still simulated — the biggest remaining gap:**
- Buying airtime/data (`lib/services/purchase.ts` — `submitAirtimePurchase`,
  `submitDataPurchase`) is mock. A user can fund their wallet with real money but cannot
  yet buy real airtime/data. Blocked on VTU provider credentials — see below.

## Blocking actual launch

1. **VTU provider account + credentials.** Decided on **VTU.ng**, not VTpass — VTpass
   requires CAC business registration for live API access, the client doesn't have one.
   VTU.ng's KYC is individual-tiered instead (Tier 1: email only, ₦50k/day · Tier 2: BVN,
   ₦500k/day · Tier 3: BVN+NIN+face, unlimited) — Tier 2 is enough to start.
   - Client needs to register at vtu.ng, verify BVN, enable API access
   - **Their auth is JWT-based**: `POST /jwt-auth/v1/token` with email/username + password
     returns a JWT — different from Paystack's static-key model. The integration needs to
     log in and cache/refresh that token server-side.
   - IP whitelisting on their side is **optional** (confirmed from their own dashboard —
     "leave empty to disable") — no static-IP hosting workaround needed.
   - No confirmed sandbox environment. First real test will likely be a small real
     transaction (e.g. ₦100 airtime) on a Tier 1 account, not a risk-free sandbox.
   - Once credentials exist: build `lib/vtu.ts` (mirroring `lib/paystack.ts`'s shape),
     wire it into `fn_create_purchase` → real VTU call → `fn_finalize_purchase`, same
     pattern as the Paystack webhook.

2. **Paystack live keys.** Currently test keys only. Need the client's live
   `PAYSTACK_SECRET_KEY` / `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` once their Paystack account is
   verified and live, and the live webhook URL set in their dashboard (Settings → API Keys
   & Webhooks) pointing at `https://mtn-neon-six.vercel.app/api/webhooks/paystack` (or
   whatever the final domain is).

3. **Vercel production env vars — Paystack ones are missing right now.**
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   are set in Vercel already. `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`
   are **not** — wallet funding is broken on the live site until these are added
   (Project Settings → Environment Variables → Production). Once live Paystack keys exist,
   these should be swapped from test to live values, not just added once.

4. **Supabase project tier.** Confirm it's not on the free tier before real money touches
   it — free tier pauses after a week of inactivity. Also turn on **Point-in-Time
   Recovery** — not optional for a financial app.

5. **Supabase Auth redirect URLs.** The production domain needs to be added to Supabase's
   allowed redirect URL list (Auth settings) or signup/password-reset emails will link to
   the wrong place / get rejected.

## Real, but not launch-blocking

- **Client's logo hasn't arrived.** Everywhere currently shows a generated placeholder —
  brand-yellow square with a "B" mark (`app/icon.tsx`, `app/apple-icon.tsx`,
  `app/icon-192.png/route.tsx`, `app/icon-512.png/route.tsx`, `components/layout/logo.tsx`).
  Swap these for real assets once the logo shows up; note `manifest.ts` icon entries need
  the sizes to match.
- **Terms & Conditions / Privacy Policy have no real content.** Signup requires a checkbox
  agreeing to them, but there's no actual page behind it yet — needs real legal content
  from the client (or an honest placeholder page, not fabricated legal text).
- **Permanent/dedicated virtual account funding** — client asked for this (so users can fund
  by bank transfer, not just card). **Paystack's version requires CAC** (confirmed blocked,
  same issue as VTpass). **Monnify explicitly supports "starter businesses" without CAC**,
  using BVN/NIN individual verification instead — this is the viable path. Not started yet.
  If the client ends up registering a CAC anyway (relatively fast/cheap in Nigeria), Paystack
  DVA becomes an option again too.
- **NDPR / CBN compliance** — flagged early, not resolved. Needs a real lawyer, not me.
- **No error monitoring** (Sentry or equivalent) on the deployed app.
- **No app-level rate limiting** beyond Supabase Auth's own built-in limits.
- Client hasn't answered the rest of the original business-details questionnaire (address,
  social handles, longer description) — not blocking, just unconfirmed.

## When the client's credentials arrive — what to actually do

**VTU.ng credentials show up →**
1. Add `VTU_EMAIL` / `VTU_PASSWORD` (or whatever their JWT auth needs) to `.env.local`,
   never in chat.
2. Build `lib/vtu.ts`: token fetch + cache, airtime/data purchase calls, following the
   shape of `lib/paystack.ts`.
3. Wire `components/airtime/airtime-purchase-flow.tsx` and
   `components/data/data-purchase-flow.tsx` off the mock `submitAirtimePurchase` /
   `submitDataPurchase` onto real Server Actions calling `fn_create_purchase` → VTU.ng →
   `fn_finalize_purchase`.
4. Test with a small real transaction (no sandbox exists). Verify via
   `supabase db query --linked` the same way funding was verified this session.
5. Run `supabase db advisors --linked --type all` after any new migration — this caught two
   real security regressions this session, treat it as mandatory, not optional.

**Live Paystack keys show up →**
1. Update Vercel Production env vars (test → live values).
2. Update the webhook URL in Paystack's live-mode dashboard.
3. Do one real small live transaction end-to-end before telling the client it's ready.

**Logo shows up →** Replace the placeholder icon routes/components listed above.

**Client answers the CAC question definitively →**
- No CAC, ever → build the Monnify integration for virtual accounts.
- Getting CAC anyway → either provider works; Monnify is still probably simpler since it's
  purpose-built for this (reserved accounts are their core product).

## Architecture quick-reference (for a fresh session)

- `supabase/migrations/*.sql` — read these in order, they tell the real story of the schema
  including two self-corrections (`0003`/`0008` both fix the same class of mistake: Supabase
  grants `EXECUTE` to `anon`/`authenticated` on new functions by default, and revoking from
  `public` alone doesn't undo that — must revoke from the specific roles explicitly).
- `lib/supabase/{client,server,admin}.ts` — three different Supabase clients: browser
  (RLS-scoped), server (RLS-scoped, cookie-based), admin (service role, bypasses RLS —
  server-only, `import "server-only"` enforced).
- `lib/services/*.ts` — server-only data reads, called from Server Components.
- `lib/actions/*.ts` — `"use server"` Server Actions, the client-callable boundary. If a
  Client Component needs to call something in `lib/services/`, it goes through here instead
  — services use `next/headers` which cannot be imported into client bundles.
- `lib/paystack.ts` — `settlePaystackTransaction` is the single settlement path shared by
  both the webhook (`app/api/webhooks/paystack/route.ts`) and the client-confirm action
  (`lib/actions/wallet.ts`) — idempotent by construction via `payment_events` +
  `wallet_ledger.reference`'s unique constraint.
- Money only ever moves through `fn_create_purchase`, `fn_finalize_purchase`, and
  `fn_credit_wallet_from_payment` (all in the migrations) — these are SECURITY DEFINER
  Postgres functions, locked to `authenticated` or `service_role` only. The frontend cannot
  credit or debit a wallet under any circumstance — this is enforced at the database level,
  not just in application code.

## Known gotchas hit this session (don't re-debug these)

- **Paystack Inline's `callback` must be a plain function, not `async`.** An `async`
  function's constructor is `AsyncFunction`, not `Function`, and Paystack's SDK validates
  against that — throws "Attribute callback must be a valid function". Fix: keep the
  outer callback synchronous, run async work in an inner IIFE (see
  `components/wallet/fund-wallet-flow.tsx`).
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (function name `middleware` →
  `proxy` too). Already migrated — just don't recreate the old file.
- **Supabase's default-privilege grants bite you on every new SECURITY DEFINER function.**
  `revoke ... from public` does NOT revoke from `anon`/`authenticated` — they get their own
  implicit grant on function creation. Always revoke from all three explicitly, then
  re-grant only the intended role. Always re-run `supabase db advisors --linked` after a
  migration that adds/replaces a function.
- **`example.com` email addresses are rejected by Supabase Auth** (`email_address_invalid`)
  — use a real-looking domain like `gmail.com` for test signups.
- **This Vercel project was not connected to GitHub for most of the session** — deployed
  manually via CLI, so `git push` did nothing to the live site for a while. Now connected;
  future pushes to `main` auto-deploy. If the live site ever looks stale again, check
  Project Settings → Git in the Vercel dashboard before assuming a build failure.
