-- "Data left" on a SIM is now read by the gateway instead of typed by an admin. The myMTN app
-- shows the balance on the Share Data screen, the gateway sends it back with each result, and the
-- website stores it here. An admin can still type a figure, but doesn't have to:
--   bundle_remaining_mb null  = not known yet; the SIM still takes orders (the gateway checks the
--                               real balance on the phone before sharing and hands the order on
--                               if it's too low)
--   bundle_checked_at         = when the gateway last read it (null = typed by an admin, or never)
--
-- Arithmetic on null stays null, so reserve/release in 0028's functions need no change.
-- Same signatures as 0031, so `create or replace` keeps the service_role-only grants.

alter table public.data_sources alter column bundle_remaining_mb drop not null;
alter table public.data_sources alter column bundle_remaining_mb drop default;
alter table public.data_sources add column bundle_checked_at timestamptz;

create or replace function public.fn_sim_allocate(
  p_purchase_id uuid,
  p_amount_mb integer,
  p_recipient text,
  p_exclude uuid[] default '{}',
  p_online_seconds integer default 180,
  p_transport text default 'gateway'
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
     and s.transport = p_transport
     and (p_transport = 'api' or s.last_seen_at > now() - make_interval(secs => p_online_seconds))
     and not (s.id = any (p_exclude))
     and (case when s.usage_day = v_today then s.transferred_today_mb else 0 end) + p_amount_mb <= s.daily_limit_mb
     and (s.bundle_remaining_mb is null or s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb)
     and (case when s.usage_month = v_month then s.transfers_this_month else 0 end) < s.free_transfers_per_month
   -- Known-good balances first, then least recently used.
   order by (s.bundle_remaining_mb is null), s.last_used_at nulls first
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

create or replace function public.fn_sim_capacity(p_amount_mb integer, p_online_seconds integer default 180, p_transport text default 'gateway')
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.data_sources s
     where s.is_active
       and s.transport = p_transport
       and (p_transport = 'api' or s.last_seen_at > now() - make_interval(secs => p_online_seconds))
       and (case when s.usage_day = (now() at time zone 'Africa/Lagos')::date then s.transferred_today_mb else 0 end) + p_amount_mb <= s.daily_limit_mb
       and (s.bundle_remaining_mb is null or s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb)
       and (case when s.usage_month = to_char(now() at time zone 'Africa/Lagos', 'YYYY-MM') then s.transfers_this_month else 0 end) < s.free_transfers_per_month
  )
$$;
