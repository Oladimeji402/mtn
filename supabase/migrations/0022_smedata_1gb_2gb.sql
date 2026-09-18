-- Adds SMEData.ng's 1GB and 2GB "Data Share" (30-day) plans, per client request. Same
-- confirmed member-dashboard pricing basis as migration 0019 (₦570 / ₦1,140), 10% markup:
-- round(570 * 1.10) = 627, round(1140 * 1.10) = 1254. reseller_cost cached for the same
-- price-drift detection wired up in lib/actions/purchase.ts (migration 0020).
--
-- mtn-2gb-30d already exists as a VTU plan ("2GB + 2 mins", ₦1,649) — SME's version is
-- plain data with no bonus minutes, a different product, not a duplicate, so both are kept
-- rather than one replacing the other. Using id 'mtn-2gb-30d-share' to avoid colliding with
-- the existing VTU row's id. No such collision for 1GB (existing VTU rows are 1-day/7-day
-- only), so 'mtn-1gb-30d' is free to use directly.
--
-- Both active immediately — same as 3GB/5GB (migration 0017/0019), pricing sourced directly
-- from the logged-in reseller dashboard, not the public homepage.

insert into public.data_plans
  (id, network, size, size_in_mb, validity_days, price, category, popular, active, provider, sme_size_code, reseller_cost)
values
  ('mtn-1gb-30d', 'MTN', '1GB', 1000, 30, 627, 'monthly', false, true, 'smedata', '1gb', 570.00),
  ('mtn-2gb-30d-share', 'MTN', '2GB', 2000, 30, 1254, 'monthly', false, true, 'smedata', '2gb', 1140.00);
