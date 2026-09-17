# Bunben Data Hub — Launch Checklist & Handoff

Last updated: 2026-09-17. Written so a fresh Claude Code session (or anyone else) can pick this
up cold — read this file first, then the codebase.

## Status at a glance

**Real and working right now** (verified live, not just "looks done"):
- Supabase Auth end-to-end: signup, login (email or username), password reset, email
  verification, admin login
- Full Postgres schema with RLS (`supabase/migrations/`, 10 migrations, all applied)
- **Wallet funding via Monipay — fully proven live, real money, 2026-09-17.** Real ₦821
  bank transfer → Monipay webhook fired (`POST /api/webhooks/monipay` → 200, ~3-13s) →
  signature verified → wallet credited exactly ₦700 (the requested amount, not the
  fee-inclusive total). Caught and fixed a real bug in the same test: when the webhook wins
  the race against the client-side confirm call (common — it's fast), the success screen was
  showing a stale pre-funding balance instead of the real one. Fixed in `lib/actions/wallet.ts`.
- **Airtime/data purchases via VTU.ng — fully proven live, real money, 2026-09-17.** Real ₦50
  MTN airtime purchase to a real phone number completed in ~9 seconds, `status: successful`,
  VTU order reference `6144694`. Wallet debit, purchase record, and notification all correct.
  Full stack: `lib/vtu.ts`, `lib/actions/purchase.ts`, `app/api/webhooks/vtu/route.ts`,
  `data_plans` reseeded with VTU.ng's real live MTN catalog (9 plans, 10% markup over
  `reseller_price` — see "Purchases: VTU.ng" below) and no per-purchase size cap.
- All reads (wallet, transactions, notifications, data plans, usage) — real Supabase data
- Admin: enable/disable users. The per-purchase data cap (was 5GB, admin-configurable) was
  removed entirely at the client's request (migration `0011`) — any active plan, including
  the 36GB/75GB ones, can be bought in one transaction now. Admin → Settings is currently an
  empty state (`components/admin/admin-settings-form.tsx`) since that was its only field.
- PWA install banner, manifest, generated placeholder icons
- Deployed at https://mtn-neon-six.vercel.app (Vercel project `bellosulaimons-projects/mtn`,
  now connected to GitHub `Oladimeji402/mtn` for auto-deploy on push to `main`)

**Biggest remaining gap:** none on the core money flows anymore — both Monipay funding and
VTU.ng airtime/data purchase are proven live with real transactions (see above). What's left
is genuinely operational/business stuff: the Monipay fee amount, the logo, legal content,
and deployment config (see "Blocking actual launch" below).

## Security audit (2026-09-17)

Full pre-launch pass — race conditions, rate limiting, secret exposure, auth/RLS gaps.
`npm audit`: 0 vulnerabilities. `tsc`/`eslint`/`next build`: clean. `supabase db advisors`:
only pre-existing, intentional warnings remain (see below).

**Found and fixed:**
- **Real race condition in `fn_finalize_purchase`** (migration `0014`). It locked the
  purchase row (`for update`) but never re-checked status after acquiring the lock, so two
  genuinely concurrent callers (e.g. the VTU webhook and a customer's "Check status" click
  landing at the same moment) could both pass the app-level "still processing" check, then
  both try to finalize. Traced the actual blast radius: `wallet_ledger.reference`'s unique
  constraint (`<ref>-RFD`) meant a second refund attempt would hit a unique-violation and
  roll back — so this was **not** an actual double-credit risk, but it meant the second
  caller got a raw Postgres error instead of the clean idempotent no-op the code already
  claimed to provide. Fixed by checking status inside the lock, atomically.
- **`/api/cron/vtu-balance-check` failed open.** If `CRON_SECRET` was ever left unset, the
  route's auth check was skipped entirely — anyone with the URL could read Bunben's real
  VTU.ng wallet balance and trigger unlimited balance checks. Now fails closed: an unset
  secret means every request is rejected, not allowed.
- **No rate limiting anywhere** on the two action groups that either spend real money (VTU
  purchases) or hit a paid third-party API (Monipay initialize). Added a DB-backed per-user
  limiter (migration `0015`, `lib/rate-limit.ts`) — no Redis needed, works immediately:
  - `purchase_airtime` / `purchase_data`: 10 per 5 minutes
  - `wallet_funding_initiate`: 5 per 5 minutes (this transitively bounds
    `confirmWalletFundingAction` too, since it only works against references that action
    creates)
  - Verified directly against the live DB (simulated an authenticated session): allows N,
    then correctly throws `RATE_LIMITED` on the N+1th.
- **Same Supabase default-grant gotcha this project has now hit three times** (`0003`,
  `0008`, and now `0016`): `revoke ... from public` does not revoke the implicit grant
  Supabase gives `anon`/`authenticated` on function creation. `fn_check_rate_limit` was
  briefly callable by `anon` (harmless in practice — it immediately raises on a null
  `auth.uid()` — but tightened for consistency). **Always explicitly revoke from
  `anon, authenticated, public` on every new `SECURITY DEFINER` function, every time.**
- **Missing security headers.** Added `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy` via `next.config.ts`. Deliberately did **not** add
  `Strict-Transport-Security` (Vercel sets it automatically on every deployment, and setting
  it ourselves would also apply in local dev, where a browser that caches an HSTS rule for
  `localhost` then refuses to load plain `http://localhost` afterward) or a full
  Content-Security-Policy (getting it wrong — blocking a font, a redirect, a future embed —
  is a worse outcome on launch day than not having one yet; needs deliberate, unhurried work).

**Checked and confirmed already safe** (worth knowing this was actually verified, not
assumed):
- Every sensitive table's RLS policies scope reads/writes to `auth.uid() = user_id or
  is_admin()` — checked `wallets`, `wallet_ledger`, `purchases`, `notifications` directly
  against the migrations. No IDOR: a user can't read or act on another user's data by
  guessing an ID, RLS filters it out even where application code doesn't explicitly filter.
- `/admin/*` has two independent layers: `proxy.ts` middleware only checks "is logged in",
  but `app/admin/(shell)/layout.tsx` separately calls `getCurrentAdmin()`, which requires a
  real `admin_users` row and redirects to `/admin/login` otherwise. A regular customer
  logging in and navigating to `/admin` gets bounced before any admin data loads.
- The Monipay wallet-credit race (webhook vs. client-confirm racing to call
  `fn_credit_wallet_from_payment` for the same reference) was already correctly handled —
  traced it through: the second caller's insert into `wallet_ledger` hits the same unique
  constraint, the whole transaction rolls back, and `settleMonipayTransaction` already
  catches that specific Postgres error code (`23505`) and returns success gracefully.
- No hardcoded secrets anywhere in source or git history (checked `git log -p` on every
  `.env*`-matching path — only `.env.example`, a placeholder file, was ever committed).
- Every file touching a secret (`lib/vtu.ts`, `lib/monipay.ts`, `lib/purchase-fulfillment.ts`,
  `lib/notify-admins.ts`, `lib/rate-limit.ts`, `lib/supabase/admin.ts`) has `import
  "server-only"` at the top, and no Client Component anywhere imports `createAdminClient`
  (checked every call site).
- Only `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` use the public env prefix
  — both intentionally public by Supabase's own design (RLS is the real boundary, not key
  secrecy). No secret accidentally marked public.
- CSRF on Server Actions: confirmed via Next.js 16's own docs
  (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`) that the framework
  itself rejects a Server Action POST when its `Origin` doesn't match the deployment's
  `Host` — not configured to allow extra origins, so this is on by default. The
  Monipay-callback-URL-from-headers logic in `lib/actions/wallet.ts` is safe as a result.
- No `dangerouslySetInnerHTML` anywhere — no stored/reflected XSS surface from user input.
- Webhook signature checks (Monipay HMAC-SHA512, VTU HMAC-SHA256) both use
  `crypto.timingSafeEqual`, not `===` — not vulnerable to a timing side-channel.
- A replay of an old, legitimate, correctly-signed webhook payload is a safe no-op either
  way — idempotency is enforced by `payment_events.processed_at` / purchase status, not by
  the webhook's freshness.

**Still open — needs a human, not more code** (all low-severity, none launch-blocking):
- **Enable Supabase's "leaked password protection"** (Settings → Authentication → Password
  Security in the Supabase dashboard) — flagged by `supabase db advisors`, checks new
  passwords against HaveIBeenPwned. A 10-second dashboard toggle, not something the CLI can
  do from here.
- **Configure Vercel Firewall rate limiting** once deployed — the DB-based limiter above is
  the inner, per-user layer; Vercel's own Firewall (dashboard-configured, works per-IP,
  free on all plans as of Next.js 15.5+) is the recommended *outer* layer for Server Actions
  and API routes in 2026, and catches abuse before it even reaches the app (e.g. an
  unauthenticated flood of the webhook endpoints, which the DB limiter above can't cover
  since it's keyed by `auth.uid()`).
- A full Content-Security-Policy — deliberately deferred, see above.

## Payment provider: Monipay

This project switched from Paystack to **Monipay** (`api.monipay.ng`) on 2026-09-17, at the
client's direction — they said they personally work with the company behind it and have used
it on other projects. Flagging this plainly for whoever picks this up next:

- Before this switch, Paystack was fully live-tested end-to-end with real transactions.
  Monipay is a much less-established name — a web search at the time turned up no independent
  reviews or third-party confirmation it's a real, operating, licensed processor, and its
  public API docs are structurally near-identical to Paystack's (same endpoint shapes, same
  HMAC-SHA512 webhook signing) with the names swapped, which is a pattern worth being alert to
  in general. The client gave a first-hand vouching (personal relationship with the vendor),
  which is why the integration went ahead. Live testing since then is a point *in favor* of
  legitimacy: it accepted live keys, returned a real dynamic Sterling Bank virtual account, and
  rejected the wrong key type with a specific, sensible error — not the behavior of a fake
  endpoint. Still worth independently confirming (CBN licensed-PSP list, CAC registration)
  before scaling up real volume, especially since no full transaction has completed yet.
- Implementation follows the client-supplied spec's hosted-checkout redirect flow exactly
  (`POST /transaction/initialize` → redirect to `authorization_url` → Monipay redirects back
  to `callback_url` → `GET /transaction/verify/{reference}` server-side). Their Inline JS
  popup option was deliberately not built — its callback/close hooks weren't fully documented
  in the spec, and guessing at an undocumented API surface for a real money flow isn't worth
  the risk.
- **Real discrepancies found between the spec and the live API** (don't trust the spec text
  over what's actually in `lib/monipay.ts` — that reflects what was empirically confirmed):
  - `/transaction/initialize` requires the **public** key. The spec says "public or private" —
    the live API rejects the private key outright with `"Use public key for this endpoint."`
  - `/transaction/verify` still uses the **secret** key, as documented.
  - Verify's `data.status` field is lowercase `"success"`/`"pending"` in practice; one page of
    their own docs says `APPROVED`. `lib/monipay.ts`'s status check lowercases and checks both.
- Bank-transfer checkout shows the customer a **fee on top of the requested amount** (~8.87%
  on a ₦1,500 top-up — ₦133). This is unusually high for a transfer channel (most NG gateways
  charge a small flat fee for transfers, not a card-like percentage). There's a dashboard
  toggle for who bears it — **Settings → Payment Methods → "Enable transaction charge on
  customer"** (currently ON, so the customer pays it; switch off to have Bunben absorb it via
  a smaller settlement instead). The account is on **"Basic Business"** tier with **0%
  compliance/KYB complete** — this fee may not reflect the final rate once KYB is done. Client
  is following up with Monipay directly on the real fee schedule; revisit before launch.
- `MONIPAY_SECRET_KEY` / `MONIPAY_PUBLIC_KEY` are both in `.env.local` now (live keys, added by
  the client directly — never pasted in chat, never typed by the agent, matching the standing
  rule for all credentials in this project).

## Purchases: VTU.ng

Airtime/data purchases were fully mocked until 2026-09-17 — `lib/services/purchase.ts` and
`lib/mock/data-plans.ts` (both deleted) never touched the real `purchases`/`data_plans` tables
or the `fn_create_purchase`/`fn_finalize_purchase` functions, even though those functions and
the reads (`getDataPlans`, `getTransactions`) were already real. Now wired for real:

- `lib/vtu.ts` — JWT login (`POST /jwt-auth/v1/token`), MTN airtime/data purchase calls,
  variations lookup, requery, webhook signature verification (HMAC-SHA256, signed with the
  account's **user PIN**, not the login password — a third, separate credential).
- **Token caching is DB-backed** (`vtu_auth_state` table, migration `0009`), not just
  in-memory — this app runs on Vercel (serverless), and separate function instances don't
  share memory. VTU.ng invalidates the previous token every time a new one is issued, so an
  in-memory-only cache would cause unrelated warm instances to silently start failing auth.
  `vtuFetch()` also retries once with a forced re-login on a `jwt_auth_invalid_token`/
  `jwt_auth_failed` error, so a stale/invalidated token self-heals instead of surfacing an
  error to the customer.
- `lib/purchase-fulfillment.ts` — `finalizeVtuPurchase()` is the single settlement path,
  shared by the purchase Server Action (immediate outcome from VTU's synchronous response) and
  the webhook (later outcome). **Important:** `fn_finalize_purchase` (the Postgres function)
  is *not* idempotent on its own — calling it twice with 'failed' would refund twice. The
  idempotency guard lives in `finalizeVtuPurchase`'s application code (only finalize a purchase
  still in `'processing'`), not in the database function — don't remove that check.
- **VTU.ng's webhook is not the primary fulfillment signal**, unlike Monipay/Paystack. Per
  their own docs, the webhook's "Order Completed" event only fires when an admin *manually*
  completes an order — normal automated completions are only reported in the purchase call's
  own synchronous HTTP response. The webhook mainly exists for automatic refunds and that rare
  manual-complete case. `app/api/webhooks/vtu/route.ts` reflects this — it's a secondary path,
  not the main one.
- A purchase that comes back `processing-api` (still fulfilling) leaves the `purchases` row in
  `'processing'` and shows a "pending" step in the UI. There's a manual **"Check status"**
  button on the transaction detail page (`requeryPurchaseAction` → `POST /api/v2/requery`) as
  the safety net for a stuck order — no cron/polling job exists, this is deliberately manual
  for now.
- `data_plans` reseeded (migration `0010`) with VTU.ng's real live MTN catalog — 9 plans,
  each with a real `vtu_variation_id`. Selling price is a **flat 10% markup over
  `reseller_price`** (migration `0012`, client's request, 2026-09-17) — `reseller_price` is
  what's actually deducted from Bunben's own VTU.ng wallet on purchase; the earlier price
  (VTU's own suggested retail `price` field, from migration `0010`) gave near-zero margin on
  some plans, literally ₦0 on the 1GB/1-day plan. Current prices: ₦549 (1GB/1 day) up to
  ₦19,799 (75GB/30 days). If VTU's `reseller_price` changes (they can reprice), these are
  static DB values and won't auto-update — re-fetch `GET /api/v2/variations/data?service_id=mtn`
  periodically and recompute `round(reseller_price * 1.10)` if margins need checking.
  - Airtime doesn't need an equivalent markup — VTU already discounts what they charge
    Bunben below face value on airtime purchases (`amount_charged` < `amount` in their
    response), so charging the customer the full face amount is already profitable by
    construction. Data needed explicit handling because plans have a fixed sell price,
    not a customer-entered amount.
  - There is no per-purchase size cap — it was removed entirely (migration `0011`,
    2026-09-17, client's request). All 9 plans, including 36GB/75GB, are purchasable.
- **Credentials are in `.env.local`** (`VTU_USERNAME` = the account's email, `VTU_PASSWORD`,
  `VTU_USER_PIN` — a separate transaction PIN, not the login password). Still need adding to
  Vercel's Production env vars for the live site — see "Blocking actual launch" below.
- **No VTU.ng sandbox exists**, confirmed by using the real thing: a real ₦50 MTN airtime
  purchase completed successfully in ~9s (`status: successful`, VTU order ref `6144694`,
  2026-09-17) — see "Status at a glance" above.
- **Admin low-balance notifications** (migration `0013`, `lib/notify-admins.ts`) — Bunben's
  VTU.ng wallet is a separate real-money balance the client funds directly with VTU.ng, not
  something customer payments via Monipay top up automatically. Two paths notify every admin
  (via the same in-app notification bell users see — an admin has their own profile/user_id
  like anyone else, no separate admin-alerts surface was built):
  1. **Reactive** — `lib/actions/purchase.ts` catches VTU's `insufficient_funds` error code
     specifically and notifies immediately when a real customer purchase fails because of it.
  2. **Proactive** — `app/api/cron/vtu-balance-check/route.ts`, triggered once daily at
     06:00 UTC by Vercel Cron (`vercel.json`), checks the balance directly and warns if
     it's under `VTU_LOW_BALANCE_THRESHOLD` (defaults to ₦5,000) — catches it before a
     customer is affected, not just after. Once-daily, not more frequent, because this
     project is on Vercel's **Hobby plan**, which only allows once-per-day cron schedules
     — the original every-6-hours schedule failed at deploy time for exactly this reason.
     If the project ever upgrades to Pro, this can go back to a tighter interval.
  - Both skip notifying an admin who already has an unread notification of this type, so
    it can't spam a dozen copies of the same unresolved warning.
  - **The cron only runs once deployed to Vercel** — there's no scheduler on localhost. Set
    `CRON_SECRET` in Vercel's env vars (same value as `.env.local`) so the route only
    accepts Vercel's own cron requests, not arbitrary public GETs.

## Blocking actual launch

1. **Monipay's fee is unresolved.** ~8.87% on a bank transfer is high; client is following up
   with Monipay directly. Decide (and possibly flip the "who bears the fee" toggle) before
   launch.
2. **Vercel production env vars are missing Monipay's and VTU's entirely.**
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are
   set in Vercel already. `MONIPAY_SECRET_KEY`, `MONIPAY_PUBLIC_KEY`, `VTU_USERNAME`,
   `VTU_PASSWORD`, `VTU_USER_PIN`, **`CRON_SECRET`** are **not** — both wallet funding and
   purchases are broken on the live site until these are added (Project Settings →
   Environment Variables → Production), and the VTU balance-check cron route stays
   unauthenticated (it now fails closed — see "Security audit" — but it still needs the real
   secret to actually run). Also register both webhook URLs in each provider's dashboard,
   pointing at `https://mtn-neon-six.vercel.app/api/webhooks/monipay` and `.../api/webhooks/vtu`
   (both are currently pointed at a throwaway ngrok tunnel from local testing — dead as soon
   as that tunnel closes).
3. **Configure Vercel Firewall rate limiting** and **enable Supabase's leaked-password
   protection** — both dashboard-only, see "Security audit" above for specifics.
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
  by bank transfer, not just card). Note Monipay's checkout *already* generates a one-off
  dynamic virtual account per transaction via the bank-transfer channel — worth checking with
  Monipay whether they also offer a *permanent/reserved* account product before reaching for
  Monnify (researched earlier, doesn't need CAC) as a second provider.
- **NDPR / CBN compliance** — flagged early, not resolved. Needs a real lawyer, not me.
- **No error monitoring** (Sentry or equivalent) on the deployed app.
- **No app-level rate limiting** beyond Supabase Auth's own built-in limits. VTU.ng's own API
  has undocumented purchase-endpoint rate limits (`429 rate_limit_exceeded`/`wallet_busy` exist
  as error codes, no stated threshold) — worth asking their support once launch volume is a
  real question.
- Client hasn't answered the rest of the original business-details questionnaire (address,
  social handles, longer description) — not blocking, just unconfirmed.

## When the client's credentials/answers arrive — what to actually do

**Deploying to production →**
1. Add `MONIPAY_SECRET_KEY`, `MONIPAY_PUBLIC_KEY`, `VTU_USERNAME`, `VTU_PASSWORD`,
   `VTU_USER_PIN`, `CRON_SECRET` to Vercel's Production env vars — all already live-tested via
   `.env.local` locally, just not deployed yet.
2. Register both webhook URLs in each provider's live dashboard, pointing at the real
   production domain, not the ngrok tunnel used for local testing.
3. Restore `MIN_FUNDING_AMOUNT` to ₦1,350 in `lib/constants.ts` (temporarily ₦700 for testing).
4. Do one more real small transaction on each provider against the *production* deployment
   specifically before telling the client it's ready — local testing proved the code works,
   not that the production env vars are wired correctly.

**Monipay's real fee schedule comes back →**
1. Decide who bears it (customer, current default, vs. Bunben absorbing it — the dashboard
   toggle is Settings → Payment Methods → "Enable transaction charge on customer").

**Logo shows up →** Replace the placeholder icon routes/components listed above.

**Client answers the CAC question definitively →**
- No CAC, ever → check Monipay's own virtual-account product first, Monnify second.
- Getting CAC anyway → either provider works.

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
- `lib/monipay.ts` — `settleMonipayTransaction` is the single settlement path shared by
  both the webhook (`app/api/webhooks/monipay/route.ts`) and the client-confirm action
  (`lib/actions/wallet.ts`) — idempotent by construction via `payment_events` +
  `wallet_ledger.reference`'s unique constraint.
- `lib/vtu.ts` + `lib/purchase-fulfillment.ts` — same idempotent-settlement pattern as
  Monipay, but split into two files since VTU purchases have two settlement callers (the
  Server Action's synchronous outcome, and the webhook's later one) sharing
  `finalizeVtuPurchase()`.
- Money only ever moves through `fn_create_purchase`, `fn_finalize_purchase`, and
  `fn_credit_wallet_from_payment` (all in the migrations) — these are SECURITY DEFINER
  Postgres functions, locked to `authenticated` or `service_role` only. The frontend cannot
  credit or debit a wallet under any circumstance — this is enforced at the database level,
  not just in application code.

## Known gotchas hit across sessions (don't re-debug these)

- **Wallet funding is a full-page redirect, not a popup.** Monipay's spec only fully documents
  the hosted-checkout redirect flow (`authorization_url` → redirect → Monipay redirects back
  to `callback_url`), so that's what's built — no Inline JS popup. This means
  `window.location.href = authorizationUrl` causes a real navigation away from the app; all
  React state resets on return, which is why `components/wallet/fund-wallet-flow.tsx` reads
  its own `monipay_reference` query param on mount instead of relying on in-memory state to
  know a payment is being confirmed.
- **A password/credential can leak into a URL if a form submits before React hydrates.** Hit
  this testing login through an ngrok tunnel — Next.js's dev server blocks JS/HMR requests
  from origins not in `allowedDevOrigins` (see `next.config.ts`) with silent 403s, so the page
  never hydrated and every form submit fell back to the browser's native behavior, which
  defaults to GET-with-querystring without an explicit `method="post"`. Fixed two ways: added
  `allowedDevOrigins: ["*.ngrok-free.app"]` so hydration actually works over a tunnel, and
  added `method="post"` to every credential-bearing `<form>` as defense-in-depth (so even a
  pre-hydration native submit doesn't put secrets in a URL/server log). If testing via a new
  tunnel domain later, add it to `allowedDevOrigins` too.
- **Next.js 16 renamed `middleware.ts` → `proxy.ts`** (function name `middleware` →
  `proxy` too). Already migrated — just don't recreate the old file.
- **Supabase's default-privilege grants bite you on every new SECURITY DEFINER function.**
  `revoke ... from public` does NOT revoke from `anon`/`authenticated` — they get their own
  implicit grant on function creation. Always revoke from all three explicitly, then
  re-grant only the intended role. Always re-run `supabase db advisors --linked` after a
  migration that adds/replaces a function.
- **`example.com` email addresses are rejected by Supabase Auth** (`email_address_invalid`)
  — use a real-looking domain like `gmail.com` for test signups.
- **This Vercel project was not connected to GitHub for most of an earlier session** —
  deployed manually via CLI, so `git push` did nothing to the live site for a while. Now
  connected; future pushes to `main` auto-deploy. If the live site ever looks stale again,
  check Project Settings → Git in the Vercel dashboard before assuming a build failure.
