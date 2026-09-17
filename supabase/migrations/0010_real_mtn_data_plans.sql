-- Replaces the placeholder data_plans seeded for the mock UI phase with VTU.ng's real,
-- live MTN catalog (fetched from GET /api/v2/variations/data?service_id=mtn on 2026-09-17).
-- No real purchase has ever referenced the old rows — the purchase flow was fully mocked
-- until this point — so a delete-and-reseed is safe rather than an update-in-place.
--
-- `price` here is VTU.ng's own suggested reseller price for each plan (what they publish
-- as `price` in the variations list, distinct from `reseller_price` — what actually gets
-- deducted from Bunben's VTU.ng wallet on purchase). Selling at VTU's suggested price bakes
-- in their own small built-in margin (price - reseller_price, ~₦0-2000/plan depending on
-- size) without this migration having to invent Bunben's own markup. Adjust `price` later
-- via this table if a different margin is wanted.
--
-- The two largest plans (36GB, 75GB) exceed platform_settings.max_purchase_data_gb's
-- current default (5GB) and won't be purchasable until an admin raises that cap in
-- Admin > Settings — that's the existing per-purchase safety limit working as designed,
-- not a bug in this migration.

delete from public.data_plans;

insert into public.data_plans
  (id, network, size, size_in_mb, validity_days, price, category, popular, active, vtu_variation_id)
values
  ('mtn-1gb-1d',    'MTN', '1GB + 1.5 mins',  1000,  1,  499,   'daily',   false, true, '5506674'),
  ('mtn-1gb-7d',    'MTN', '1GB + 5 mins',    1000,  7,  819,   'weekly',  false, true, '2676'),
  ('mtn-2gb-30d',   'MTN', '2GB + 2 mins',    2000,  30, 1599,  'monthly', true,  true, '244542'),
  ('mtn-3-5gb-30d', 'MTN', '3.5GB + 5 mins',  3500,  30, 2599,  'monthly', false, true, '5506738'),
  ('mtn-7gb-30d',   'MTN', '7GB',             7000,  30, 3699,  'monthly', false, true, '244538'),
  ('mtn-10gb-30d',  'MTN', '10GB + 10 mins',  10000, 30, 4799,  'monthly', false, true, '2677'),
  ('mtn-16-5gb-30d','MTN', '16.5GB',          16500, 30, 6699,  'monthly', false, true, '244540'),
  ('mtn-36gb-30d',  'MTN', '36GB',            36000, 30, 11999, 'monthly', false, true, '2673'),
  ('mtn-75gb-30d',  'MTN', '75GB',            75000, 30, 19999, 'monthly', false, true, '2667');
