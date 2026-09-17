-- Closes a real race condition found in a pre-launch security review: two concurrent
-- callers (e.g. the VTU webhook and a customer's manual "Check status" click landing at
-- the same moment) could both pass the application-level "still processing" check before
-- either commits, then both call this function. The `for update` lock already serializes
-- them correctly, but the function body never re-checked status after acquiring the lock
-- — so the second caller, once unblocked, would blindly re-run the finalize logic.
--
-- In practice this was NOT a double-credit risk — wallet_ledger.reference is unique, so a
-- second refund attempt's insert (same deterministic `<reference>-RFD`) would violate that
-- constraint and roll the whole transaction back. But it meant the second caller got a raw
-- Postgres unique-violation error instead of the clean idempotent no-op the application
-- code's comments already claimed this function provided. Fixed by checking status right
-- after the lock, inside the same transaction, so it's genuinely atomic now.

create or replace function public.fn_finalize_purchase(
  p_purchase_id uuid,
  p_status public.transaction_status,
  p_provider_reference text,
  p_failure_reason text
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_purchase public.purchases;
  v_wallet public.wallets;
begin
  select * into v_purchase from public.purchases where id = p_purchase_id for update;
  if v_purchase is null then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  -- Already finalized by a caller that got here first while we were waiting on the lock
  -- above — return the current row unchanged instead of re-applying the transition.
  if v_purchase.status <> 'processing' then
    return v_purchase;
  end if;

  update public.purchases
    set status = p_status, provider_reference = p_provider_reference,
        failure_reason = p_failure_reason, completed_at = now()
    where id = p_purchase_id
    returning * into v_purchase;

  update public.wallet_ledger set status = p_status where reference = v_purchase.reference;

  if p_status = 'failed' then
    update public.wallets
      set balance = balance + v_purchase.amount, updated_at = now()
      where user_id = v_purchase.user_id
      returning * into v_wallet;

    insert into public.wallet_ledger (
      reference, user_id, type, direction, amount, balance_before, balance_after,
      status, description, related_purchase_id
    ) values (
      v_purchase.reference || '-RFD', v_purchase.user_id, 'refund', 'credit', v_purchase.amount,
      v_wallet.balance - v_purchase.amount, v_wallet.balance,
      'successful', 'Refund — purchase delivery failed', v_purchase.id
    );

    update public.purchases set status = 'refunded' where id = p_purchase_id
      returning * into v_purchase;
  end if;

  return v_purchase;
end;
$$;
