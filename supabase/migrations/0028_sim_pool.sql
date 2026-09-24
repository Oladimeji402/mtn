-- SIM pool: the client's own MTN SIMs as a data source (Architecture A), fulfilled by a small
-- gateway program that sits next to the SIMs and dials MTN's data-gifting USSD.
--
-- Design rules that shaped this file:
--  * Only phone numbers are stored. No SIM PINs, OTPs or credentials ever live in the database.
--  * A SIM's capacity is the LOWER of MTN's 5GB/day gifting cap and its remaining bundle (every
--    gift drains the SIM's own bundle), so both are tracked. Numbers are MTN's published rules:
--    5GB/day cumulative, keep >=100MB after a transfer, 10 free transfers/month.
--  * Allocation reserves capacity in the same transaction that picks the SIM, under one
--    advisory lock, so two simultaneous orders can never take the same SIM's last capacity.
--  * An ambiguous outcome (gateway died mid-dial, lease expired) is 'unknown' and is NEVER
--    retried automatically: retrying could deliver the data twice. An admin resolves it.
--  * Everything here is service-role only (recurring Supabase default-grant gotcha: revoke
--    from anon/authenticated/public explicitly, see 0003/0008/0016).

alter table public.data_plans drop constraint data_plans_provider_check;
alter table public.data_plans
  add constraint data_plans_provider_check check (provider in ('vtu', 'smedata', 'sim'));

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  msisdn text not null unique check (msisdn ~ '^0[0-9]{10}$'),
  is_active boolean not null default true,
  -- Admin-maintained estimate of data left on the SIM; reduced on every reservation.
  bundle_remaining_mb integer not null default 0 check (bundle_remaining_mb >= 0),
  min_reserve_mb integer not null default 100 check (min_reserve_mb >= 0),
  daily_limit_mb integer not null default 5000 check (daily_limit_mb > 0),
  free_transfers_per_month integer not null default 10 check (free_transfers_per_month >= 0),
  usage_day date,
  transferred_today_mb integer not null default 0 check (transferred_today_mb >= 0),
  usage_month text,
  transfers_this_month integer not null default 0 check (transfers_this_month >= 0),
  last_used_at timestamptz,
  -- Set by the gateway heartbeat: a SIM only takes orders while a gateway says it is live.
  last_seen_at timestamptz,
  gateway_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.fulfillment_job_status as enum
  ('queued', 'claimed', 'succeeded', 'failed', 'unknown', 'cancelled');

create table public.fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  attempt integer not null default 1,
  source_id uuid not null references public.data_sources (id),
  recipient_msisdn text not null,
  amount_mb integer not null check (amount_mb > 0),
  status public.fulfillment_job_status not null default 'queued',
  claimed_by text,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  result_code text,
  result_message text,
  -- Whether this job's reservation on its SIM has been given back.
  released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_id, attempt)
);
create index fulfillment_jobs_status_created_idx on public.fulfillment_jobs (status, created_at);
create index fulfillment_jobs_source_idx on public.fulfillment_jobs (source_id);

alter table public.data_sources enable row level security;
alter table public.fulfillment_jobs enable row level security;
revoke all on public.data_sources from anon, authenticated, public;
revoke all on public.fulfillment_jobs from anon, authenticated, public;

-- One global lock for every function that changes pool state. Order volume is tiny (a handful
-- per day), so serialising them costs nothing and removes every allocation/release race.
create or replace function public.fn_sim_lock() returns void
language sql as $$ select pg_advisory_xact_lock(hashtext('bunben_sim_pool')) $$;

-- ---------------------------------------------------------------------------------------
-- Allocation. Idempotent per purchase: a live (queued/claimed) job is returned unchanged.
-- ---------------------------------------------------------------------------------------
create or replace function public.fn_sim_allocate(
  p_purchase_id uuid,
  p_amount_mb integer,
  p_recipient text,
  p_exclude uuid[] default '{}',
  p_online_seconds integer default 180
)
returns public.fulfillment_jobs
language plpgsql security definer set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_month text := to_char(now() at time zone 'Africa/Lagos', 'YYYY-MM');
  v_attempt integer;
  v_src public.data_sources;
  v_job public.fulfillment_jobs;
begin
  perform public.fn_sim_lock();

  select * into v_job from public.fulfillment_jobs
   where purchase_id = p_purchase_id and status in ('queued', 'claimed')
   order by attempt desc limit 1;
  if found then return v_job; end if;

  select coalesce(max(attempt), 0) + 1 into v_attempt
    from public.fulfillment_jobs where purchase_id = p_purchase_id;

  select * into v_src from public.data_sources s
   where s.is_active
     and s.last_seen_at > now() - make_interval(secs => p_online_seconds)
     and not (s.id = any (p_exclude))
     and (case when s.usage_day = v_today then s.transferred_today_mb else 0 end) + p_amount_mb <= s.daily_limit_mb
     and s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb
   order by
     -- Stay inside the 10 free transfers/month where possible, then rotate least-recently-used.
     ((case when s.usage_month = v_month then s.transfers_this_month else 0 end) >= s.free_transfers_per_month),
     s.last_used_at nulls first
   limit 1;
  if not found then raise exception 'NO_CAPACITY'; end if;

  update public.data_sources set
    transferred_today_mb = (case when usage_day = v_today then transferred_today_mb else 0 end) + p_amount_mb,
    usage_day = v_today,
    transfers_this_month = (case when usage_month = v_month then transfers_this_month else 0 end) + 1,
    usage_month = v_month,
    bundle_remaining_mb = bundle_remaining_mb - p_amount_mb,
    last_used_at = now(),
    updated_at = now()
  where id = v_src.id;

  insert into public.fulfillment_jobs (purchase_id, attempt, source_id, recipient_msisdn, amount_mb)
  values (p_purchase_id, v_attempt, v_src.id, p_recipient, p_amount_mb)
  returning * into v_job;
  return v_job;
end;
$$;

-- True when at least one online SIM could take an order of this size right now.
create or replace function public.fn_sim_capacity(p_amount_mb integer, p_online_seconds integer default 180)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.data_sources s
     where s.is_active
       and s.last_seen_at > now() - make_interval(secs => p_online_seconds)
       and (case when s.usage_day = (now() at time zone 'Africa/Lagos')::date then s.transferred_today_mb else 0 end) + p_amount_mb <= s.daily_limit_mb
       and s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb
  )
$$;

-- Gives a job's reservation back to its SIM, once.
create or replace function public.fn_sim_release_job(p_job_id uuid) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.fulfillment_jobs;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_month text := to_char(now() at time zone 'Africa/Lagos', 'YYYY-MM');
begin
  select * into v_job from public.fulfillment_jobs where id = p_job_id for update;
  if not found or v_job.released then return; end if;

  update public.data_sources set
    transferred_today_mb = case when usage_day = v_today then greatest(0, transferred_today_mb - v_job.amount_mb) else transferred_today_mb end,
    transfers_this_month = case when usage_month = v_month then greatest(0, transfers_this_month - 1) else transfers_this_month end,
    bundle_remaining_mb = bundle_remaining_mb + v_job.amount_mb,
    updated_at = now()
  where id = v_job.source_id;

  update public.fulfillment_jobs set released = true, updated_at = now() where id = p_job_id;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Gateway polling: hand the oldest queued job for a SIM this gateway currently has live.
-- ---------------------------------------------------------------------------------------
create or replace function public.fn_sim_claim(p_gateway text, p_live text[], p_lease_seconds integer default 120)
returns table (job_id uuid, purchase_id uuid, source_msisdn text, recipient_msisdn text, amount_mb integer, attempt integer)
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.fulfillment_jobs;
  v_msisdn text;
begin
  select j.* into v_job
    from public.fulfillment_jobs j
    join public.data_sources s on s.id = j.source_id
   where j.status = 'queued' and s.msisdn = any (p_live)
   order by j.created_at
   limit 1
   for update of j skip locked;
  if not found then return; end if;

  select s.msisdn into v_msisdn from public.data_sources s where s.id = v_job.source_id;

  update public.fulfillment_jobs set
    status = 'claimed', claimed_by = p_gateway, claimed_at = now(),
    lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id = v_job.id;

  return query select v_job.id, v_job.purchase_id, v_msisdn, v_job.recipient_msisdn, v_job.amount_mb, v_job.attempt;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Outcome from the gateway (or an admin resolving an 'unknown'). Returns what the app must
-- do next; the DB only moves the job and the SIM counters.
--   success            -> job succeeded            -> action finalize_success
--   failed             -> release, job failed      -> action finalize_failed
--   limit_reached      -> release, SIM marked full for today, job failed -> action reallocate
--   insufficient_bundle-> release, SIM bundle set to 0, job failed        -> action reallocate
--   unknown            -> keep reserved, job unknown                      -> action hold
-- Idempotent: a report for a job already settled is a no-op.
-- ---------------------------------------------------------------------------------------
create or replace function public.fn_sim_report(p_job_id uuid, p_outcome text, p_code text default null, p_message text default null)
returns table (purchase_id uuid, source_id uuid, action text, recipient_msisdn text, amount_mb integer, excluded uuid[])
language plpgsql security definer set search_path = public
as $$
declare
  v_job public.fulfillment_jobs;
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_excluded uuid[];
begin
  perform public.fn_sim_lock();

  select * into v_job from public.fulfillment_jobs where id = p_job_id for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;

  -- Only a job that is still open (or was parked as unknown) can be settled.
  if v_job.status not in ('claimed', 'unknown') then
    return query select v_job.purchase_id, v_job.source_id, 'noop'::text, v_job.recipient_msisdn, v_job.amount_mb, '{}'::uuid[];
    return;
  end if;

  select coalesce(array_agg(j.source_id), '{}') into v_excluded
    from public.fulfillment_jobs j where j.purchase_id = v_job.purchase_id;

  if p_outcome = 'success' then
    update public.fulfillment_jobs set status = 'succeeded', result_code = p_code, result_message = p_message, updated_at = now() where id = p_job_id;
    return query select v_job.purchase_id, v_job.source_id, 'finalize_success'::text, v_job.recipient_msisdn, v_job.amount_mb, v_excluded;

  elsif p_outcome = 'failed' then
    update public.fulfillment_jobs set status = 'failed', result_code = p_code, result_message = p_message, updated_at = now() where id = p_job_id;
    perform public.fn_sim_release_job(p_job_id);
    return query select v_job.purchase_id, v_job.source_id, 'finalize_failed'::text, v_job.recipient_msisdn, v_job.amount_mb, v_excluded;

  elsif p_outcome in ('limit_reached', 'insufficient_bundle') then
    update public.fulfillment_jobs set status = 'failed', result_code = p_code, result_message = p_message, updated_at = now() where id = p_job_id;
    perform public.fn_sim_release_job(p_job_id);
    if p_outcome = 'limit_reached' then
      update public.data_sources set usage_day = v_today, transferred_today_mb = daily_limit_mb, updated_at = now() where id = v_job.source_id;
    else
      update public.data_sources set bundle_remaining_mb = 0, updated_at = now() where id = v_job.source_id;
    end if;
    return query select v_job.purchase_id, v_job.source_id, 'reallocate'::text, v_job.recipient_msisdn, v_job.amount_mb, v_excluded;

  else
    -- 'unknown' or anything unrecognised: never guess. Stay reserved, park for an admin.
    update public.fulfillment_jobs set status = 'unknown', result_code = p_code, result_message = p_message, updated_at = now() where id = p_job_id;
    return query select v_job.purchase_id, v_job.source_id, 'hold'::text, v_job.recipient_msisdn, v_job.amount_mb, v_excluded;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------------------
-- Housekeeping, called opportunistically (Hobby-plan cron is once a day, so no cron reliance):
--   claimed + lease expired  -> 'unknown' (the gateway may have dialled; never auto-retry)
--   queued for > 10 minutes  -> cancelled + released (never dialled, safe to redo elsewhere)
-- ---------------------------------------------------------------------------------------
create or replace function public.fn_sim_sweep(p_queue_timeout_seconds integer default 600)
returns table (purchase_id uuid, job_id uuid, source_id uuid, kind text)
language plpgsql security definer set search_path = public
as $$
declare
  r record;
begin
  perform public.fn_sim_lock();

  for r in
    select * from public.fulfillment_jobs
     where status = 'claimed' and lease_expires_at < now()
       for update
  loop
    update public.fulfillment_jobs set status = 'unknown', result_code = 'LEASE_EXPIRED',
      result_message = 'Gateway stopped responding mid-transfer', updated_at = now() where id = r.id;
    return query select r.purchase_id, r.id, r.source_id, 'unknown'::text;
  end loop;

  for r in
    select * from public.fulfillment_jobs
     where status = 'queued' and created_at < now() - make_interval(secs => p_queue_timeout_seconds)
       for update
  loop
    update public.fulfillment_jobs set status = 'cancelled', result_code = 'QUEUE_TIMEOUT',
      result_message = 'No gateway picked this up in time', updated_at = now() where id = r.id;
    perform public.fn_sim_release_job(r.id);
    return query select r.purchase_id, r.id, r.source_id, 'expired'::text;
  end loop;
end;
$$;

revoke all on function public.fn_sim_lock() from public, anon, authenticated;
revoke all on function public.fn_sim_allocate(uuid, integer, text, uuid[], integer) from public, anon, authenticated;
revoke all on function public.fn_sim_capacity(integer, integer) from public, anon, authenticated;
revoke all on function public.fn_sim_release_job(uuid) from public, anon, authenticated;
revoke all on function public.fn_sim_claim(text, text[], integer) from public, anon, authenticated;
revoke all on function public.fn_sim_report(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.fn_sim_sweep(integer) from public, anon, authenticated;
grant execute on function public.fn_sim_lock() to service_role;
grant execute on function public.fn_sim_allocate(uuid, integer, text, uuid[], integer) to service_role;
grant execute on function public.fn_sim_capacity(integer, integer) to service_role;
grant execute on function public.fn_sim_release_job(uuid) to service_role;
grant execute on function public.fn_sim_claim(text, text[], integer) to service_role;
grant execute on function public.fn_sim_report(uuid, text, text, text) to service_role;
grant execute on function public.fn_sim_sweep(integer) to service_role;

-- Inactive placeholder plans so the SIM route is ready but nothing changes for customers
-- until an admin turns these on (and the SMEData equivalents off). Prices are placeholders
-- copied from the SMEData plans; set the real prices before activating.
insert into public.data_plans
  (id, network, size, size_in_mb, validity_days, price, category, popular, active, provider)
values
  ('mtn-1gb-sim', 'MTN', '1GB', 1000, 30, 630, 'monthly', false, false, 'sim'),
  ('mtn-2gb-sim', 'MTN', '2GB', 2000, 30, 1260, 'monthly', false, false, 'sim'),
  ('mtn-3gb-sim', 'MTN', '3GB', 3000, 30, 1890, 'monthly', false, false, 'sim'),
  ('mtn-5gb-sim', 'MTN', '5GB', 5000, 30, 3150, 'monthly', false, false, 'sim');
