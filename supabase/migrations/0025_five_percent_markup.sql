-- Client decision (2026-09-21): markup on SMEData.ng plans drops from 10% to 5% over the
-- confirmed API-charged reseller cost (migration 0023): round(cost * 1.05).
update public.data_plans set price = round(reseller_cost * 1.05) where provider = 'smedata';
