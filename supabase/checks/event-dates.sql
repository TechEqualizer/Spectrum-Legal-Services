-- Plan 1, step 4 gate: every event's date rows match its dates as visitors
-- see them (the published list, else the built one). Run before switching
-- readers to event_dates; zero rows back means they match.
with live as (
  select f.funnel_id, d
  from public.event_funnels f
  left join public.funnel_publications p on p.slug = f.slug
  cross join lateral jsonb_array_elements(coalesce(p.data -> 'events', f.data -> 'events', '[]'::jsonb)) as d
)
select coalesce(l.funnel_id, r.funnel_id) as funnel_id, coalesce(l.d ->> 'id', r.id) as date_id,
       case when r.id is null then 'missing row' when l.d is null then 'extra row' else 'different' end as problem
from live l
full join public.event_dates r on r.funnel_id = l.funnel_id and r.id = l.d ->> 'id'
where l.d is null or r.id is null
   or r.starts_at <> (l.d ->> 'startsAt')::timestamptz
   or r.name <> l.d ->> 'name'
   or r.ticket_url <> l.d ->> 'ticketUrl'
   or r.status is distinct from nullif(l.d ->> 'status', '')
   or r.time_zone is distinct from nullif(l.d ->> 'timeZone', '')
   or r.opening_reel_id is distinct from nullif(l.d ->> 'reelId', '');
