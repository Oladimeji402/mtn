-- A real 1GB purchase (purchases.reference = DAT-1789733261947-8fca5d68, provider_reference
-- 878774) just proved SMEData's /data API charges ₦600 for 1gb, not the ₦570 "member" price
-- shown on their logged-in storefront (migration 0019's basis) — the price-drift check in
-- lib/actions/purchase.ts caught this automatically. The storefront's "Sale!" discount only
-- applies to purchases made through their own website checkout, not the API.
--
-- This means migration 0019's "correction" was itself wrong — the original, pre-login
-- public-homepage prices (migration 0017's basis) were the real ones. Since all four plans
-- show the same "Sale!" discount pattern on the storefront, the same gap is assumed to apply
-- to 2GB/3GB/5GB too, though only 1GB is confirmed by an actual transaction so far — worth
-- confirming the rest with real purchases before fully trusting this for all four.
--
-- Same 10% markup formula: round(600*1.10)=660, round(1200*1.10)=1320, round(1800*1.10)=1980,
-- round(3000*1.10)=3300.

update public.data_plans set price = 660,  reseller_cost = 600.00  where id = 'mtn-1gb-30d';
update public.data_plans set price = 1320, reseller_cost = 1200.00 where id = 'mtn-2gb-30d-share';
update public.data_plans set price = 1980, reseller_cost = 1800.00 where id = 'mtn-3gb-30d';
update public.data_plans set price = 3300, reseller_cost = 3000.00 where id = 'mtn-5gb-30d';
