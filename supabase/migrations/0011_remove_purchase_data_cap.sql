-- Client decision (2026-09-17): remove the per-purchase data cap entirely. Any active
-- data_plans row — including the 36GB/75GB VTU.ng plans — can now be bought in one
-- transaction. Drops the admin-configurable ceiling introduced in
-- 0007_max_purchase_data_setting.sql since it no longer does anything.

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

  if p_type = 'data' and not exists (
    select 1 from public.data_plans where id = p_data_plan_id and active
  ) then
    raise exception 'INVALID_PLAN';
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

alter table public.platform_settings drop column max_purchase_data_gb;
