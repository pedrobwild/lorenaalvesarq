alter table public.crash_reports add column if not exists session_id text;
create index if not exists crash_reports_session_id_idx on public.crash_reports (session_id);