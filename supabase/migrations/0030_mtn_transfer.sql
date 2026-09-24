-- MTN's official Customer Data Transfer API as a second way to send from the client's own numbers
-- (the first is the modem gateway from 0028). A "source" now has a transport:
--   gateway : sends through the on-site gateway; only usable while that gateway reports it online
--   api     : sends by calling MTN's API from the server; no gateway, so no online/offline notion
-- Same pool tables, same limits (5GB/day, data left, free transfers), same allocation guarantees.
--
-- fn_sim_allocate / fn_sim_capacity gain a transport argument. Their old signatures are dropped
-- (a new overload would leave the old, un-filtered one callable) and re-granted to service_role only.

alter table public.data_plans drop constraint data_plans_provider_check;
alter table public.data_plans
  add constraint data_plans_provider_check check (provider in ('vtu', 'smedata', 'sim', 'mtn_transfer'));

alter table public.data_sources
  add column transport text not null default 'gateway' check (transport in ('gateway', 'api'));

-- MTN's transactionId for an API transfer, so a callback or status check can find its job.
alter table public.fulfillment_jobs add column external_ref text;
create index fulfillment_jobs_external_ref_idx on public.fulfillment_jobs (external_ref) where external_ref is not null;

drop function public.fn_sim_allocate(uuid, integer, text, uuid[], integer);
drop function public.fn_sim_capacity(integer, integer);

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
     -- Only a gateway-driven SIM needs to be reporting in; an API sender is always reachable.
     and (p_transport = 'api' or s.last_seen_at > now() - make_interval(secs => p_online_seconds))
     and not (s.id = any (p_exclude))
     and (case when s.usage_day = v_today then s.transferred_today_mb else 0 end) + p_amount_mb <= s.daily_limit_mb
     and s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb
   order by
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
       and s.bundle_remaining_mb - p_amount_mb >= s.min_reserve_mb
  )
$$;

-- API mode has no gateway to claim a job, so the server marks its own job as in flight.
create or replace function public.fn_sim_begin(p_job_id uuid, p_actor text, p_external_ref text, p_lease_seconds integer default 120)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  update public.fulfillment_jobs set
    status = 'claimed', claimed_by = p_actor, claimed_at = now(), external_ref = p_external_ref,
    lease_expires_at = now() + make_interval(secs => p_lease_seconds), updated_at = now()
  where id = p_job_id and status = 'queued';
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.fn_sim_allocate(uuid, integer, text, uuid[], integer, text) from public, anon, authenticated;
revoke all on function public.fn_sim_capacity(integer, integer, text) from public, anon, authenticated;
revoke all on function public.fn_sim_begin(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.fn_sim_allocate(uuid, integer, text, uuid[], integer, text) to service_role;
grant execute on function public.fn_sim_capacity(integer, integer, text) to service_role;
grant execute on function public.fn_sim_begin(uuid, text, text, integer) to service_role;

-- Inactive until MTN has approved the client's numbers as senders and a real transfer works.
insert into public.data_plans
  (id, network, size, size_in_mb, validity_days, price, category, popular, active, provider)
values
  ('mtn-5gb-transfer', 'MTN', '5GB', 5000, 30, 3150, 'monthly', false, false, 'mtn_transfer');
