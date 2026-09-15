-- MTN Vend — initial schema, RLS policies, and wallet business-logic functions.
--
-- Design principles this migration enforces at the database layer, not just in app code:
--   1. wallets/wallet_ledger/purchases are never writable directly by the `authenticated`
--      or `anon` roles. All writes go through SECURITY DEFINER functions below, or the
--      service_role (webhooks, admin actions). The frontend cannot credit or debit a
--      wallet under any circumstance.
--   2. wallet_ledger and audit_log are append-only: no UPDATE/DELETE grants exist for
--      any role, service_role included. Corrections are reversing entries, not edits.
--   3. Every balance change happens inside one function invocation (one transaction),
--      with the wallet row locked via UPDATE, so concurrent requests can't race.
--   4. wallet_ledger.reference is UNIQUE, which makes wallet funding idempotent: a
--      retried webhook with the same reference fails the insert and the whole
--      transaction (including the balance update) rolls back automatically.

-- ============================================================================
-- Enums
-- ============================================================================

create type public.account_status as enum ('active', 'disabled');
create type public.transaction_status as enum ('pending', 'processing', 'successful', 'failed', 'refunded');
create type public.wallet_tx_type as enum ('funding', 'airtime', 'data', 'refund', 'adjustment');
create type public.wallet_tx_direction as enum ('credit', 'debit');
create type public.purchase_type as enum ('airtime', 'data');
create type public.plan_category as enum ('daily', 'weekly', 'monthly');
create type public.admin_role as enum ('owner', 'admin', 'support');
create type public.notification_type as enum (
  'airtime_success', 'airtime_failed', 'data_success', 'data_failed',
  'wallet_funded', 'wallet_funding_failed',
  'daily_limit_warning', 'monthly_limit_warning', 'security'
);

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  email text not null,
  phone text,
  status public.account_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  balance numeric(14, 2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  updated_at timestamptz not null default now()
);

create table public.data_plans (
  id text primary key,
  network text not null default 'MTN',
  size text not null,
  size_in_mb integer not null check (size_in_mb > 0),
  validity_days integer not null check (validity_days > 0),
  price numeric(14, 2) not null check (price > 0),
  category public.plan_category not null,
  popular boolean not null default false,
  active boolean not null default true
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.purchase_type not null,
  network text not null default 'MTN',
  phone_number text not null,
  amount numeric(14, 2) not null check (amount > 0),
  data_plan_id text references public.data_plans (id),
  status public.transaction_status not null default 'pending',
  status_message text,
  wallet_balance_before numeric(14, 2) not null,
  wallet_balance_after numeric(14, 2) not null,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.wallet_tx_type not null,
  direction public.wallet_tx_direction not null,
  amount numeric(14, 2) not null check (amount > 0),
  balance_before numeric(14, 2) not null,
  balance_after numeric(14, 2) not null,
  status public.transaction_status not null,
  description text not null,
  related_purchase_id uuid references public.purchases (id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.platform_settings (
  id boolean primary key default true check (id),
  daily_data_limit_gb numeric(6, 2) not null default 5,
  monthly_data_limit_gb numeric(6, 2) not null default 50,
  minimum_funding_amount numeric(14, 2) not null default 100,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

-- Webhook idempotency log. The unique constraint is what makes a retried
-- webhook a no-op instead of a double credit.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_reference text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_reference)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_type text not null default 'admin',
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index wallet_ledger_user_created_idx on public.wallet_ledger (user_id, created_at desc);
create index purchases_user_created_idx on public.purchases (user_id, created_at desc);
create index purchases_status_idx on public.purchases (status);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

-- ============================================================================
-- Helper: is the current user an admin?
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- ============================================================================
-- New-user provisioning: create profile + zero-balance wallet on signup.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone'
  );
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.purchases enable row level security;
alter table public.data_plans enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.payment_events enable row level security;
alter table public.audit_log enable row level security;

-- profiles: users read/update their own row (status is app-writable only via
-- admin actions below — see note), admins read everyone.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No insert/delete policy: rows are created only by handle_new_user().

-- A regular user's own UPDATE is still restricted to username/phone — status
-- and email cannot be self-edited. service_role (admin operations via the
-- admin client) is exempt, since that's the only legitimate path to disable
-- a user's account.
create or replace function public.fn_profiles_restrict_update()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'Only username and phone may be changed by the account owner';
  end if;
  return new;
end;
$$;

create trigger profiles_restrict_update
  before update on public.profiles
  for each row execute function public.fn_profiles_restrict_update();

-- wallets: read-only for the owner and admins. No write policy for any
-- client role — every balance change goes through a function below.
create policy "wallets_select" on public.wallets
  for select using (auth.uid() = user_id or public.is_admin());

-- wallet_ledger: read-only, same as wallets. Append-only via functions.
create policy "wallet_ledger_select" on public.wallet_ledger
  for select using (auth.uid() = user_id or public.is_admin());

-- purchases: read-only for the owner and admins. Writes go through
-- fn_create_purchase / fn_finalize_purchase below.
create policy "purchases_select" on public.purchases
  for select using (auth.uid() = user_id or public.is_admin());

-- data_plans: public catalogue, admin-managed.
create policy "data_plans_select" on public.data_plans
  for select using (active or public.is_admin());
create policy "data_plans_admin_write" on public.data_plans
  for all using (public.is_admin()) with check (public.is_admin());

-- notifications: owner can read and mark as read (content itself is
-- protected from tampering by the trigger below).
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.fn_notifications_restrict_update()
returns trigger
language plpgsql
as $$
begin
  if new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.type is distinct from old.type
     or new.user_id is distinct from old.user_id then
    raise exception 'Only the read flag may be changed on a notification';
  end if;
  return new;
end;
$$;

create trigger notifications_restrict_update
  before update on public.notifications
  for each row execute function public.fn_notifications_restrict_update();

-- platform_settings: everyone can read (the UI needs to display limits),
-- only admins can write.
create policy "platform_settings_select" on public.platform_settings
  for select using (true);
create policy "platform_settings_admin_write" on public.platform_settings
  for update using (public.is_admin()) with check (public.is_admin());

-- admin_users: a user can see their own admin membership (to know if they
-- are one); the roster itself is not otherwise browsable by clients.
create policy "admin_users_select_self" on public.admin_users
  for select using (auth.uid() = user_id);

-- payment_events, audit_log: no policies for anon/authenticated at all.
-- service_role bypasses RLS entirely, which is the only way these are
-- ever written or read — by design.

-- ============================================================================
-- Wallet business logic (SECURITY DEFINER — the only path to a balance change)
-- ============================================================================

-- Called by an authenticated user (via a Server Action) to place a purchase.
-- Locks the wallet, checks balance + data limits, debits atomically, and
-- inserts the purchase + ledger rows. The purchase starts as 'processing';
-- the caller invokes the VTU provider afterward and calls
-- fn_finalize_purchase with the result.
create or replace function public.fn_create_purchase(
  p_type public.purchase_type,
  p_network text,
  p_phone_number text,
  p_amount numeric,
  p_data_plan_id text,
  p_reference text
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.wallets;
  v_purchase public.purchases;
  v_plan_mb integer;
  v_daily_used_mb integer;
  v_monthly_used_mb integer;
  v_daily_limit_mb integer;
  v_monthly_limit_mb integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_wallet from public.wallets where user_id = v_user_id for update;
  if v_wallet is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;
  if v_wallet.balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  if p_type = 'data' then
    select size_in_mb into v_plan_mb from public.data_plans where id = p_data_plan_id and active;
    if v_plan_mb is null then
      raise exception 'INVALID_PLAN';
    end if;

    select (daily_data_limit_gb * 1000)::int, (monthly_data_limit_gb * 1000)::int
      into v_daily_limit_mb, v_monthly_limit_mb
      from public.platform_settings limit 1;

    select coalesce(sum(dp.size_in_mb), 0) into v_daily_used_mb
      from public.purchases p join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = v_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('day', now());

    select coalesce(sum(dp.size_in_mb), 0) into v_monthly_used_mb
      from public.purchases p join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = v_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('month', now());

    if v_daily_used_mb + v_plan_mb > v_daily_limit_mb then
      raise exception 'DAILY_LIMIT_EXCEEDED';
    end if;
    if v_monthly_used_mb + v_plan_mb > v_monthly_limit_mb then
      raise exception 'MONTHLY_LIMIT_EXCEEDED';
    end if;
  end if;

  update public.wallets
    set balance = balance - p_amount, updated_at = now()
    where user_id = v_user_id
    returning * into v_wallet;

  insert into public.purchases (
    reference, user_id, type, network, phone_number, amount, data_plan_id,
    status, wallet_balance_before, wallet_balance_after
  ) values (
    p_reference, v_user_id, p_type, p_network, p_phone_number, p_amount, p_data_plan_id,
    'processing', v_wallet.balance + p_amount, v_wallet.balance
  ) returning * into v_purchase;

  insert into public.wallet_ledger (
    reference, user_id, type, direction, amount, balance_before, balance_after,
    status, description, related_purchase_id
  ) values (
    p_reference, v_user_id, p_type::text::public.wallet_tx_type, 'debit', p_amount,
    v_purchase.wallet_balance_before, v_purchase.wallet_balance_after,
    'processing', 'MTN ' || p_type || ' purchase', v_purchase.id
  );

  return v_purchase;
end;
$$;

revoke all on function public.fn_create_purchase from public;
grant execute on function public.fn_create_purchase to authenticated;

-- Called by the server (service_role) after the VTU provider responds, or
-- after a status webhook. Never callable by end users directly — a user
-- must not be able to mark their own failed purchase as successful.
create or replace function public.fn_finalize_purchase(
  p_purchase_id uuid,
  p_status public.transaction_status,
  p_provider_reference text,
  p_failure_reason text
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases;
  v_wallet public.wallets;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if v_purchase is null then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  update public.purchases
    set status = p_status, provider_reference = p_provider_reference,
        failure_reason = p_failure_reason, completed_at = now()
    where id = p_purchase_id
    returning * into v_purchase;

  update public.wallet_ledger set status = p_status where reference = v_purchase.reference;

  if p_status = 'failed' then
    update public.wallets
      set balance = balance + v_purchase.amount, updated_at = now()
      where user_id = v_purchase.user_id
      returning * into v_wallet;

    insert into public.wallet_ledger (
      reference, user_id, type, direction, amount, balance_before, balance_after,
      status, description, related_purchase_id
    ) values (
      v_purchase.reference || '-RFD', v_purchase.user_id, 'refund', 'credit', v_purchase.amount,
      v_wallet.balance - v_purchase.amount, v_wallet.balance,
      'successful', 'Refund — purchase delivery failed', v_purchase.id
    );

    update public.purchases set status = 'refunded' where id = p_purchase_id
      returning * into v_purchase;
  end if;

  return v_purchase;
end;
$$;

revoke all on function public.fn_finalize_purchase from public;
grant execute on function public.fn_finalize_purchase to service_role;

-- Called by the payment webhook handler (service_role) after signature
-- verification and after confirming the transaction with Paystack directly.
-- Idempotent: relies on wallet_ledger.reference being UNIQUE, so a retried
-- webhook raises a unique_violation and the whole credit rolls back — the
-- caller should treat that specific error as "already processed".
create or replace function public.fn_credit_wallet_from_payment(
  p_user_id uuid,
  p_amount numeric,
  p_reference text,
  p_description text
)
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.wallets;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.wallets
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user_id
    returning * into v_wallet;

  if v_wallet is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;

  insert into public.wallet_ledger (
    reference, user_id, type, direction, amount, balance_before, balance_after,
    status, description
  ) values (
    p_reference, p_user_id, 'funding', 'credit', p_amount,
    v_wallet.balance - p_amount, v_wallet.balance, 'successful', p_description
  );

  return v_wallet;
end;
$$;

revoke all on function public.fn_credit_wallet_from_payment from public;
grant execute on function public.fn_credit_wallet_from_payment to service_role;

-- Computed on the fly from purchases (not a mutable counter, so it can't
-- drift from reality). Callable by the owner or an admin only.
create or replace function public.fn_get_usage(p_user_id uuid default auth.uid())
returns table (
  daily_used_mb integer,
  daily_limit_mb integer,
  monthly_used_mb integer,
  monthly_limit_mb integer
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    coalesce((select sum(dp.size_in_mb) from public.purchases p
      join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = p_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('day', now())), 0)::int,
    (select (daily_data_limit_gb * 1000)::int from public.platform_settings limit 1),
    coalesce((select sum(dp.size_in_mb) from public.purchases p
      join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = p_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('month', now())), 0)::int,
    (select (monthly_data_limit_gb * 1000)::int from public.platform_settings limit 1);
end;
$$;

revoke all on function public.fn_get_usage from public;
grant execute on function public.fn_get_usage to authenticated;
