create table public.crash_reports (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  kind text not null,
  message text not null,
  stack text,
  route text,
  user_agent text,
  recovered boolean not null default false,
  app_version text,
  extra jsonb
);

create index crash_reports_received_at_idx on public.crash_reports (received_at desc);
create index crash_reports_kind_idx on public.crash_reports (kind);

grant select, delete on public.crash_reports to authenticated;
grant insert on public.crash_reports to anon, authenticated;
grant all on public.crash_reports to service_role;

alter table public.crash_reports enable row level security;

create policy "anon_insert_crash_reports"
on public.crash_reports
for insert
to anon, authenticated
with check (true);

create policy "admins_read_crash_reports"
on public.crash_reports
for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

create policy "admins_delete_crash_reports"
on public.crash_reports
for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));