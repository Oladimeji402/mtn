-- Own migration/transaction: ALTER TYPE ADD VALUE can't be used in the same transaction as
-- code that references the new value (same reason as 0013/0018/0021).
alter type public.notification_type add value 'sim_pool_alert';
alter type public.notification_type add value 'order_needs_review';
