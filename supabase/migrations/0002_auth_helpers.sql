-- Resolves a login identifier (email or username) to the email Supabase Auth needs.
-- Must be callable pre-login (anon role) since the user isn't authenticated yet.
--
-- Note: this does allow username enumeration in principle (a determined caller could
-- probe usernames and see which return a non-null email). The login form itself never
-- surfaces this distinction — "incorrect email/username or password" either way — and
-- Supabase Auth's own rate limiting covers repeated attempts. Acceptable for this
-- app's threat model; revisit if abuse is observed.
create or replace function public.fn_resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_identifier ilike '%@%' then
    return p_identifier;
  end if;
  return (select email from public.profiles where username = p_identifier);
end;
$$;

revoke all on function public.fn_resolve_login_email from public;
grant execute on function public.fn_resolve_login_email to anon, authenticated;
