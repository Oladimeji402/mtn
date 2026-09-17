-- Pre-launch security review (2026-09-17): the app had zero rate limiting on the two
-- action groups that either spend real money (VTU purchases) or hit a paid third-party
-- API (Monipay initialize) — a compromised session or a runaway client script could spam
-- either. Vercel's own Firewall (dashboard-configured, IP-based) is the recommended
-- outer layer for this in 2026 but can't be set from a migration — see LAUNCH_CHECKLIST.md
-- for that step. This is the inner, per-user layer: cheap, no Redis needed, and it works
-- immediately without any deploy-time configuration.

create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_user_action_idx on public.rate_limit_hits (user_id, action, created_at);

-- Same lockdown pattern as vtu_auth_state/payment_events: RLS enabled, no policies for
-- anon/authenticated — only reachable through fn_check_rate_limit below.
alter table public.rate_limit_hits enable row level security;

create or replace function public.fn_check_rate_limit(
  p_action text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select count(*) into v_count
    from public.rate_limit_hits
    where user_id = v_user_id
      and action = p_action
      and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max_attempts then
    raise exception 'RATE_LIMITED';
  end if;

  insert into public.rate_limit_hits (user_id, action) values (v_user_id, p_action);

  -- Opportunistic cleanup piggybacked on normal traffic — keeps the table small without
  -- a separate cron job. Cheap: indexed range delete, runs on every call.
  delete from public.rate_limit_hits where created_at < now() - interval '1 day';
end;
$$;

revoke all on function public.fn_check_rate_limit from public;
grant execute on function public.fn_check_rate_limit to authenticated;
