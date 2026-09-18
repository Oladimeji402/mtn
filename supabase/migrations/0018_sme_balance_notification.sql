-- Own admin-notification type for SMEData.ng, distinct from vtu_balance_low (migration
-- 0013) — reusing that one would produce a notification titled "VTU wallet is out of funds"
-- for a SMEData wallet issue, which is actively misleading for a non-technical admin.
-- Isolated in its own migration/transaction — ALTER TYPE ADD VALUE historically can't run
-- in the same transaction as code that references the new value (same reason 0013 did this).

alter type public.notification_type add value 'sme_balance_low';
