-- Logging a SIM in to myMTN on the gateway phone, started and finished from the admin page.
-- MTN texts a one-time code to the SIM; the admin types it into Admin > SIMs and the gateway
-- enters it in the app. No one needs to touch the gateway machine.
--
--   requested   admin asked; waiting for the gateway to pick it up
--   working     the gateway is on it (opening the profile, entering the number, or the code)
--   needs_code  the app is showing the code screen; waiting for the admin
--   code_sent   the admin typed the code; waiting for the gateway to take it
--   succeeded / failed / cancelled / expired   finished
--
-- The code is kept only between the admin typing it and the gateway taking it (the gateway's
-- take clears it), and it expires with the login. Service-role only, like the rest of the pool.

create table public.sim_logins (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources (id) on delete cascade,
  msisdn text not null check (msisdn ~ '^0[0-9]{10}$'),
  status text not null default 'requested'
    check (status in ('requested', 'working', 'needs_code', 'code_sent', 'succeeded', 'failed', 'cancelled', 'expired')),
  code text check (code ~ '^[0-9]{4,8}$'),
  message text,
  gateway_id text,
  requested_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one login in progress per SIM.
create unique index sim_logins_one_open on public.sim_logins (source_id)
  where status in ('requested', 'working', 'needs_code', 'code_sent');
create index sim_logins_source_created_idx on public.sim_logins (source_id, created_at desc);

alter table public.sim_logins enable row level security;
revoke all on public.sim_logins from anon, authenticated, public;

-- Anything stuck for 10 minutes is closed, with a reason an admin can act on. MTN's codes don't
-- last longer than that anyway.
create or replace function public.fn_sim_login_expire() returns void
language sql security definer set search_path = public
as $$
  update public.sim_logins set
    status = 'expired',
    code = null,
    message = case status
      when 'requested' then 'The gateway did not pick this up. Is it running?'
      when 'needs_code' then 'No code was entered in time. Start again to get a new code.'
      else 'The gateway stopped responding during the login.'
    end,
    updated_at = now()
  where status in ('requested', 'working', 'needs_code', 'code_sent')
    and updated_at < now() - interval '10 minutes'
$$;

-- The gateway takes the oldest waiting login.
create or replace function public.fn_sim_login_claim(p_gateway text)
returns table (login_id uuid, msisdn text)
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.fn_sim_login_expire();
  select l.id into v_id from public.sim_logins l
   where l.status = 'requested'
   order by l.created_at
   limit 1
   for update skip locked;
  if not found then return; end if;

  update public.sim_logins set status = 'working', gateway_id = p_gateway, message = null, updated_at = now()
   where id = v_id;
  return query select l.id, l.msisdn from public.sim_logins l where l.id = v_id;
end;
$$;

-- The gateway takes the code the admin typed, exactly once: it is cleared as it is handed over.
create or replace function public.fn_sim_login_take_code(p_login_id uuid)
returns table (status text, code text)
language plpgsql security definer set search_path = public
as $$
declare
  v_login public.sim_logins;
begin
  perform public.fn_sim_login_expire();
  select * into v_login from public.sim_logins where id = p_login_id for update;
  if not found then return; end if;

  if v_login.status = 'code_sent' then
    update public.sim_logins set status = 'working', code = null, updated_at = now() where id = p_login_id;
    return query select 'code_sent'::text, v_login.code;
  else
    return query select v_login.status, null::text;
  end if;
end;
$$;

revoke all on function public.fn_sim_login_expire() from public, anon, authenticated;
revoke all on function public.fn_sim_login_claim(text) from public, anon, authenticated;
revoke all on function public.fn_sim_login_take_code(uuid) from public, anon, authenticated;
grant execute on function public.fn_sim_login_expire() to service_role;
grant execute on function public.fn_sim_login_claim(text) to service_role;
grant execute on function public.fn_sim_login_take_code(uuid) to service_role;
