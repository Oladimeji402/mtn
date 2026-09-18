-- Own notification type for when a real SMEData.ng purchase response charges a different
-- amount than the reseller_cost its retail price (migration 0020) was calculated from —
-- the only reliable live-price signal available for a provider with no pricing API (see
-- 0020's comment). Isolated in its own migration/transaction — ALTER TYPE ADD VALUE
-- historically can't run in the same transaction as code that references the new value.

alter type public.notification_type add value 'plan_price_drift';
