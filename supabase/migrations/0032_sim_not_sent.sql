-- A fourth gateway outcome, 'not_sent': the gateway certainly did NOT move any data (for the myMTN
-- app driver, it stopped before tapping Share: SIM logged out, wrong account on screen, the app
-- didn't load...). Unlike 'failed', that is no reason to refund the customer while other SIMs
-- have room, and unlike 'limit_reached'/'insufficient_bundle' it says nothing about the SIM's
-- allowance or data. So: release the reservation, leave the SIM's counters alone, reallocate.
-- (The gateway also stops offering that SIM until it is healthy again.)
--
-- Same signature as 0028, so `create or replace` keeps the service_role-only grants.

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

  elsif p_outcome in ('limit_reached', 'insufficient_bundle', 'not_sent') then
    update public.fulfillment_jobs set status = 'failed', result_code = p_code, result_message = p_message, updated_at = now() where id = p_job_id;
    perform public.fn_sim_release_job(p_job_id);
    if p_outcome = 'limit_reached' then
      update public.data_sources set usage_day = v_today, transferred_today_mb = daily_limit_mb, updated_at = now() where id = v_job.source_id;
    elsif p_outcome = 'insufficient_bundle' then
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
