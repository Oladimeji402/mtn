-- Same mistake as 0003 fixed for other functions, repeated here: 0007 recreated
-- fn_get_usage (drop + create, since its return shape changed) and only revoked from
-- `public`, not `anon` explicitly. Supabase's default-privilege grant to anon/
-- authenticated on new functions means anon regained EXECUTE. Fixing it the same way
-- 0003 did for the others.
revoke execute on function public.fn_get_usage from anon, authenticated, public;
grant execute on function public.fn_get_usage to authenticated;
