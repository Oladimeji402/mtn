-- Supports notifying admins when Bunben's own VTU.ng wallet balance runs low — a
-- separate, real-money balance the client tops up directly with VTU.ng, unrelated to
-- customer wallet funding via Monipay. See lib/services/admin-notify.ts and
-- app/api/cron/vtu-balance-check/route.ts.
--
-- Added in its own migration (not combined with code that uses it) because
-- ALTER TYPE ... ADD VALUE historically can't be used in the same transaction that
-- added it on older Postgres — keeping it isolated avoids relying on version-specific
-- relaxations of that rule.
alter type public.notification_type add value 'vtu_balance_low';
