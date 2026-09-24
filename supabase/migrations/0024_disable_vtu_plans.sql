-- Client decision (2026-09-21): sell only SMEData.ng plans (1GB/2GB/3GB/5GB) and drop
-- VTU.ng plus airtime entirely. Rows are deactivated rather than deleted because past
-- purchases reference them (purchases.data_plan_id) and receipts still need the plan name.
update public.data_plans set active = false where provider = 'vtu';
