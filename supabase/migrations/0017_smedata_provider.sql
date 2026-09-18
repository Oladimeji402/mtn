-- Adds SMEData.ng as a second data-purchase provider, alongside VTU.ng, so the 3GB/5GB
-- plans the client wants (which VTU currently has out of stock — see LAUNCH_CHECKLIST.md)
-- can be sold via SMEData.ng instead. A plan now belongs to exactly one provider; purchase
-- routing in lib/actions/purchase.ts branches on this column.

alter table public.data_plans
  add column provider text not null default 'vtu' check (provider in ('vtu', 'smedata')),
  add column sme_size_code text;

-- Existing rows are all VTU-backed already (the column default covers them); vtu_variation_id
-- stays populated for those, sme_size_code stays null.

-- Prices below use SMEData.ng's public homepage pricing (₦1,800 / ₦3,000), NOT a confirmed
-- reseller/wallet-debit cost from their dashboard — same category of mistake migration 0012
-- had to fix for VTU (price field vs reseller_price field). Same 10% markup formula as
-- migration 0012 for consistency: round(1800 * 1.10) = 1980, round(3000 * 1.10) = 3300.
-- Inserted INACTIVE on purpose — do not flip `active` to true until the real reseller cost
-- is confirmed on the SMEData.ng dashboard and a real test purchase has succeeded.
insert into public.data_plans
  (id, network, size, size_in_mb, validity_days, price, category, popular, active, provider, sme_size_code)
values
  ('mtn-3gb-30d', 'MTN', '3GB', 3000, 30, 1980, 'monthly', false, false, 'smedata', '3gb'),
  ('mtn-5gb-30d', 'MTN', '5GB', 5000, 30, 3300, 'monthly', false, false, 'smedata', '5gb');
