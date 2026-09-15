-- Seed data for public.data_plans. Run once after the migration.
-- These are illustrative prices — replace with real VTU.ng wholesale-derived pricing
-- before going live (see lib/mock/data-plans.ts for the values currently mirrored in
-- the frontend mock layer).
--
-- No plan exceeds 5GB by design (client decision, 2026-09-15): purchases are capped at
-- 5GB each — customers buy as many separate 5GB-or-under purchases as they want. See
-- supabase/migrations/0006_data_limit_model_change.sql.

insert into public.data_plans (id, network, size, size_in_mb, validity_days, price, category, popular, active) values
  ('dp_500mb_1d', 'MTN', '500MB', 500, 1, 150, 'daily', false, true),
  ('dp_1gb_1d', 'MTN', '1GB', 1000, 1, 300, 'daily', false, true),
  ('dp_1_5gb_7d', 'MTN', '1.5GB', 1500, 7, 500, 'weekly', false, true),
  ('dp_3gb_7d', 'MTN', '3GB', 3000, 7, 1000, 'weekly', true, true),
  ('dp_500mb_30d', 'MTN', '500MB', 500, 30, 300, 'monthly', false, true),
  ('dp_1gb_30d', 'MTN', '1GB', 1000, 30, 350, 'monthly', true, true),
  ('dp_2gb_30d', 'MTN', '2GB', 2000, 30, 700, 'monthly', false, true),
  ('dp_3gb_30d', 'MTN', '3GB', 3000, 30, 1000, 'monthly', false, true),
  ('dp_5gb_30d', 'MTN', '5GB', 5000, 30, 1500, 'monthly', false, true)
on conflict (id) do nothing;
