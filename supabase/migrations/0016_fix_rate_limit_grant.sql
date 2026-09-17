-- Same recurring gotcha as 0003/0008: `revoke ... from public` does NOT revoke Supabase's
-- own implicit grant to anon/authenticated on a newly created function — must revoke from
-- the specific roles explicitly. fn_check_rate_limit was callable by anon (harmless here,
-- since it immediately raises on a null auth.uid(), but tightened for consistency and to
-- not rely on that being true forever).

revoke execute on function public.fn_check_rate_limit(text, integer, integer) from anon, authenticated, public;
grant execute on function public.fn_check_rate_limit(text, integer, integer) to authenticated;
