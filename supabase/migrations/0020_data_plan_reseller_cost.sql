-- Caches the reseller cost each data_plans.price was actually calculated from, so a real
-- purchase's live provider-charged amount can be compared against it later to detect price
-- drift (see lib/actions/purchase.ts). Only backfilling SMEData rows for now: VTU's costs
-- were already reasoned about carefully in migration 0012 and VTU exposes a public,
-- no-login variations endpoint (lib/vtu.ts fetchMtnDataVariations) that can be re-checked
-- directly if ever needed — SMEData has no such endpoint (confirmed by reading its full
-- route list), and its real reseller price is only visible after logging into their
-- dashboard, which nothing server-side can do. Comparing against real purchase responses is
-- the only reliable live signal available for SMEData.

alter table public.data_plans
  add column reseller_cost numeric(14, 2);

update public.data_plans set reseller_cost = 1710.00 where id = 'mtn-3gb-30d';
update public.data_plans set reseller_cost = 2860.00 where id = 'mtn-5gb-30d';
