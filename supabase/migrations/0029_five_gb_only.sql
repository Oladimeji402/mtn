-- Client decision (2026-09-21): sell only the 5GB plan. The 1GB/2GB/3GB SMEData plans are
-- switched off rather than deleted (past purchases reference them and receipts still need the
-- plan name). The matching inactive SIM-pool placeholder plans were never used, so they go;
-- only the 5GB SIM plan (mtn-5gb-sim) is kept for when the SIM route is activated.
update public.data_plans set active = false where id in ('mtn-1gb-30d', 'mtn-2gb-30d-share', 'mtn-3gb-30d');
delete from public.data_plans where id in ('mtn-1gb-sim', 'mtn-2gb-sim', 'mtn-3gb-sim')
  and not exists (select 1 from public.purchases p where p.data_plan_id = data_plans.id);
