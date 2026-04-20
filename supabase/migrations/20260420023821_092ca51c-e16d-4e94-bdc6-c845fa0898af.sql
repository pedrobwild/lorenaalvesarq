-- Recria a view com security_invoker para respeitar RLS do consultante
drop view if exists public.analytics_daily;
create view public.analytics_daily
with (security_invoker = true) as
select
  date_trunc('day', created_at)::date as day,
  event_type,
  count(*)                              as events,
  count(distinct session_id)            as sessions
from public.analytics_events
group by 1, 2;