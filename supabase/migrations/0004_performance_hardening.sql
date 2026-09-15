-- Fixes found by `supabase db advisors --linked --type performance`:
--
-- 1. RLS policies calling auth.uid()/is_admin() directly get re-evaluated on every row
--    scanned. Wrapping as (select auth.uid()) lets Postgres treat it as an initplan —
--    evaluated once per query instead of once per row. Doesn't change behavior, just
--    performance at scale.
-- 2. data_plans had two permissive policies both covering SELECT (data_plans_select and
--    data_plans_admin_write, the latter via `for all`), so every read evaluated both and
--    OR'd them. Narrowing data_plans_admin_write to insert/update/delete only fixes it.

drop policy "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using ((select auth.uid()) = id or (select public.is_admin()));

drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy "wallets_select" on public.wallets;
create policy "wallets_select" on public.wallets
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy "wallet_ledger_select" on public.wallet_ledger;
create policy "wallet_ledger_select" on public.wallet_ledger
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy "purchases_select" on public.purchases;
create policy "purchases_select" on public.purchases
  for select using ((select auth.uid()) = user_id or (select public.is_admin()));

drop policy "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select using ((select auth.uid()) = user_id);

drop policy "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self" on public.admin_users
  for select using ((select auth.uid()) = user_id);

drop policy "data_plans_select" on public.data_plans;
create policy "data_plans_select" on public.data_plans
  for select using (active or (select public.is_admin()));

drop policy "data_plans_admin_write" on public.data_plans;
create policy "data_plans_admin_insert" on public.data_plans
  for insert with check ((select public.is_admin()));
create policy "data_plans_admin_update" on public.data_plans
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "data_plans_admin_delete" on public.data_plans
  for delete using ((select public.is_admin()));

drop policy "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write" on public.platform_settings
  for update using ((select public.is_admin())) with check ((select public.is_admin()));
