-- Replaces the now-meaningless daily/monthly data limit settings (dropped in
-- 0006_data_limit_model_change.sql's enforcement change, but the columns and admin UI
-- still existed) with the setting that's actually real: the per-purchase GB ceiling.
-- Making this admin-configurable rather than hardcoded at 5GB in fn_create_purchase.

alter table public.platform_settings
  drop column daily_data_limit_gb,
  drop column monthly_data_limit_gb,
  add column max_purchase_data_gb numeric(6, 2) not null default 5;

create or replace function public.fn_create_purchase(
  p_type public.purchase_type,
  p_network text,
  p_phone_number text,
  p_amount numeric,
  p_data_plan_id text,
  p_reference text
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wallet public.wallets;
  v_purchase public.purchases;
  v_plan_mb integer;
  v_max_purchase_mb integer;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select * into v_wallet from public.wallets where user_id = v_user_id for update;
  if v_wallet is null then
    raise exception 'WALLET_NOT_FOUND';
  end if;
  if v_wallet.balance < p_amount then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  if p_type = 'data' then
    select size_in_mb into v_plan_mb from public.data_plans where id = p_data_plan_id and active;
    if v_plan_mb is null then
      raise exception 'INVALID_PLAN';
    end if;

    select (max_purchase_data_gb * 1000)::int into v_max_purchase_mb
      from public.platform_settings limit 1;

    if v_plan_mb > v_max_purchase_mb then
      raise exception 'PLAN_EXCEEDS_MAXIMUM';
    end if;
  end if;

  update public.wallets
    set balance = balance - p_amount, updated_at = now()
    where user_id = v_user_id
    returning * into v_wallet;

  insert into public.purchases (
    reference, user_id, type, network, phone_number, amount, data_plan_id,
    status, wallet_balance_before, wallet_balance_after
  ) values (
    p_reference, v_user_id, p_type, p_network, p_phone_number, p_amount, p_data_plan_id,
    'processing', v_wallet.balance + p_amount, v_wallet.balance
  ) returning * into v_purchase;

  insert into public.wallet_ledger (
    reference, user_id, type, direction, amount, balance_before, balance_after,
    status, description, related_purchase_id
  ) values (
    p_reference, v_user_id, p_type::text::public.wallet_tx_type, 'debit', p_amount,
    v_purchase.wallet_balance_before, v_purchase.wallet_balance_after,
    'processing', 'MTN ' || p_type || ' purchase', v_purchase.id
  );

  return v_purchase;
end;
$$;

-- fn_get_usage no longer reports a "limit" — there isn't one anymore, only the
-- per-purchase cap enforced above. Now purely informational: how much data a user
-- has bought today/this month. Return shape changed, so drop before recreating —
-- CREATE OR REPLACE can't change a function's output columns.
drop function if exists public.fn_get_usage(uuid);

create function public.fn_get_usage(p_user_id uuid default auth.uid())
returns table (
  daily_used_mb integer,
  monthly_used_mb integer
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if p_user_id <> auth.uid() and not public.is_admin() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    coalesce((select sum(dp.size_in_mb) from public.purchases p
      join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = p_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('day', now())), 0)::int,
    coalesce((select sum(dp.size_in_mb) from public.purchases p
      join public.data_plans dp on dp.id = p.data_plan_id
      where p.user_id = p_user_id and p.type = 'data'
        and p.status in ('successful', 'processing')
        and p.created_at >= date_trunc('month', now())), 0)::int;
end;
$$;

revoke all on function public.fn_get_usage from public;
grant execute on function public.fn_get_usage to authenticated;
