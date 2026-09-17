-- Real VTU.ng integration: links existing data plans to VTU.ng's catalog, and adds a
-- server-shared cache for VTU.ng's JWT (so every serverless instance doesn't need its
-- own login, and purchases don't trigger a login each time — see lib/vtu.ts).

alter table public.data_plans
  add column vtu_variation_id text;

-- Singleton row, same pattern as platform_settings. Never exposed to anon/authenticated —
-- only the admin (service_role) client in lib/vtu.ts ever touches this table, same as
-- payment_events and audit_log above.
create table public.vtu_auth_state (
  id boolean primary key default true check (id),
  token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.vtu_auth_state (id) values (true);
alter table public.vtu_auth_state enable row level security;
