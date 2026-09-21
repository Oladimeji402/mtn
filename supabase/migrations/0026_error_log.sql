-- Admin-side record of unexpected errors, replacing a third-party tracker for now. Customers
-- only ever see a generic message plus a short reference; the reference is the lookup key here.
-- Server-only: RLS on with no policies, and no grants to anon/authenticated (the recurring
-- Supabase default-grant gotcha — see migrations 0003/0008/0016), so only the service-role
-- client used by lib/error-log.ts and the admin Errors page can touch it.
create table public.error_log (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  source text not null,
  message text not null,
  stack text,
  user_id uuid references public.profiles (id) on delete set null,
  path text,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index error_log_created_at_idx on public.error_log (created_at desc);
create index error_log_ref_idx on public.error_log (ref);

alter table public.error_log enable row level security;
revoke all on public.error_log from anon, authenticated, public;
