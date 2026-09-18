-- Corrects the 3GB/5GB SMEData.ng prices set in migration 0017, which used public
-- (logged-out) homepage pricing. Logging into the actual reseller dashboard revealed lower
-- member-only pricing: ₦1,710 for 3GB (not ₦1,800) and ₦2,860 for 5GB (not ₦3,000). Same
-- 10% markup formula as migration 0012: round(1710 * 1.10) = 1881, round(2860 * 1.10) = 3146.
-- Still left INACTIVE — this dashboard price still isn't a confirmed wallet-debit amount
-- until a real test purchase proves the /data API charges the same as this storefront price.

update public.data_plans set price = 1881 where id = 'mtn-3gb-30d'; -- reseller 1710.00 (member price)
update public.data_plans set price = 3146 where id = 'mtn-5gb-30d'; -- reseller 2860.00 (member price)
