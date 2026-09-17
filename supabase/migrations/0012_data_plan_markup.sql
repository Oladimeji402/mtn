-- Client decision (2026-09-17): sell at a flat 10% markup over VTU.ng's real cost
-- (reseller_price — what's actually deducted from Bunben's own VTU.ng wallet on
-- purchase), not VTU's own suggested "price" field used in 0010_real_mtn_data_plans.sql.
-- That earlier price gave near-zero margin on some plans (literally ₦0 on the cheapest,
-- 1GB/1 day). New price = round(reseller_price * 1.10).

update public.data_plans set price = 549   where id = 'mtn-1gb-1d';      -- reseller 499.00
update public.data_plans set price = 879   where id = 'mtn-1gb-7d';      -- reseller 799.00
update public.data_plans set price = 1649  where id = 'mtn-2gb-30d';     -- reseller 1499.00
update public.data_plans set price = 2749  where id = 'mtn-3-5gb-30d';   -- reseller 2499.00
update public.data_plans set price = 3849  where id = 'mtn-7gb-30d';     -- reseller 3499.00
update public.data_plans set price = 4949  where id = 'mtn-10gb-30d';    -- reseller 4499.00
update public.data_plans set price = 7149  where id = 'mtn-16-5gb-30d';  -- reseller 6499.00
update public.data_plans set price = 12099 where id = 'mtn-36gb-30d';    -- reseller 10999.00
update public.data_plans set price = 19799 where id = 'mtn-75gb-30d';    -- reseller 17999.00
