-- Fixes found by `supabase db advisors --linked --type security` after 0001/0002 landed:
--
-- 1. Supabase grants EXECUTE on new functions to `anon` and `authenticated` by default
--    (via ALTER DEFAULT PRIVILEGES at the project level). `revoke all ... from public`
--    in 0001 does NOT undo that — PUBLIC and anon/authenticated are different grant
--    targets. Net effect: fn_finalize_purchase and fn_credit_wallet_from_payment, meant
--    to be service_role-only, were actually callable by any signed-in user (and in
--    finalize's case, by anonymous requests too). That's a real path to a user marking
--    their own failed purchase as successful, or forging a wallet credit.
-- 2. fn_profiles_restrict_update / fn_notifications_restrict_update (trigger functions)
--    were missing `set search_path`, which the linter flags as search-path-hijack risk.
-- 3. handle_new_user is a trigger function, not an RPC — it should not be directly
--    callable via /rest/v1/rpc/handle_new_user at all.

revoke execute on function public.fn_create_purchase from anon, authenticated, public;
grant execute on function public.fn_create_purchase to authenticated;

revoke execute on function public.fn_finalize_purchase from anon, authenticated, public;
grant execute on function public.fn_finalize_purchase to service_role;

revoke execute on function public.fn_credit_wallet_from_payment from anon, authenticated, public;
grant execute on function public.fn_credit_wallet_from_payment to service_role;

revoke execute on function public.fn_get_usage from anon, authenticated, public;
grant execute on function public.fn_get_usage to authenticated;

revoke execute on function public.fn_resolve_login_email from authenticated, public;
grant execute on function public.fn_resolve_login_email to anon, authenticated;

revoke execute on function public.is_admin from anon, authenticated, public;
grant execute on function public.is_admin to authenticated;

revoke execute on function public.handle_new_user from anon, authenticated, public;
-- No grant: only the on_auth_user_created trigger invokes this, which doesn't need
-- (and isn't subject to) an EXECUTE grant to a client-facing role.

create or replace function public.fn_profiles_restrict_update()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.fn_notifications_restrict_update()
returns trigger
language plpgsql
set search_path = public
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
