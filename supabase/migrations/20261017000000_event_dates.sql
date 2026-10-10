-- Event dates as rows (docs/plans/01-events-as-records.md, step 3).
--
-- Until now an event's dates lived only inside JSON: event_funnels.data
-- (as built) and funnel_publications.data (once edited). This table holds
-- each event's dates as visitors see them, one row per date, so questions
-- across events ("what's next for this organizer", "which date did this
-- Eventbrite order buy", "what crosses into Tonight at 8 PM") are queries.
--
-- Additive: nothing reads it yet. Publishing (and taking edits down)
-- rewrites an event's rows through set_event_dates, in the same request
-- that writes the publication; the backfill below copies today's dates.

create table public.event_dates (
  funnel_id text not null references public.event_funnels (funnel_id) on delete cascade,
  -- The date's id inside the event (FunnelEvent.id), stored with ticket sales.
  id text not null check (char_length(id) between 1 and 100),
  name text not null check (char_length(name) <= 200),
  -- The moment, plus the text it was written as ("2026-10-31T20:00:00-04:00"):
  -- a date with only an offset (no time zone) keeps its own wall clock.
  starts_at timestamptz not null,
  starts_at_text text not null check (char_length(starts_at_text) <= 40),
  time_zone text check (char_length(time_zone) <= 64),
  venue text check (char_length(venue) <= 300),
  price text check (char_length(price) <= 100),
  ticket_url text not null check (char_length(ticket_url) <= 2048),
  -- Eventbrite's event id, from the ticket link: sales match on it directly.
  eb_event_id text check (eb_event_id ~ '^\d{6,30}$'),
  status text check (status in ('on_sale', 'few_left', 'sold_out')),
  opening_reel_id text check (char_length(opening_reel_id) <= 100),
  updated_at timestamptz not null default now(),
  primary key (funnel_id, id)
);

comment on table public.event_dates is
  'Each event''s dates as visitors see them (published edits applied), one row per date. Written only by set_event_dates.';

create index event_dates_starts_idx on public.event_dates (starts_at);
create index event_dates_eb_idx on public.event_dates (eb_event_id) where eb_event_id is not null;

-- Public, like the links themselves: anyone can read dates; nobody writes
-- directly.
alter table public.event_dates enable row level security;
create policy "Anyone can read event dates" on public.event_dates for select using (true);
-- Spelled out rather than left to Supabase's default grants: read, never write.
revoke all on public.event_dates from anon, authenticated;
grant select on public.event_dates to anon, authenticated;

-- Replaces an event's dates with the given list, in one transaction, for
-- an admin who may publish that event. p_dates: a JSON array of
-- { id, name, startsAt, timeZone?, venue?, price?, ticketUrl, ebEventId?,
--   status?, reelId? }, as the app's FunnelEvent plus the Eventbrite id.
create function public.set_event_dates(p_slug text, p_dates jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_funnel text;
  v_count integer;
begin
  if not public.can_publish_funnel(p_slug) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select funnel_id into v_funnel from public.event_funnels where slug = p_slug;
  -- Built-in demos aren't in event_funnels: nothing to store.
  if v_funnel is null then
    return 0;
  end if;
  if jsonb_typeof(p_dates) is distinct from 'array' then
    raise exception 'dates must be a list' using errcode = '22023';
  end if;

  delete from public.event_dates where funnel_id = v_funnel;
  insert into public.event_dates (
    funnel_id, id, name, starts_at, starts_at_text, time_zone, venue, price,
    ticket_url, eb_event_id, status, opening_reel_id
  )
  select
    v_funnel,
    d ->> 'id',
    d ->> 'name',
    (d ->> 'startsAt')::timestamptz,
    d ->> 'startsAt',
    nullif(d ->> 'timeZone', ''),
    nullif(d ->> 'venue', ''),
    nullif(d ->> 'price', ''),
    d ->> 'ticketUrl',
    nullif(d ->> 'ebEventId', ''),
    nullif(d ->> 'status', ''),
    nullif(d ->> 'reelId', '')
  from jsonb_array_elements(p_dates) as d;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.set_event_dates(text, jsonb) from public, anon;
grant execute on function public.set_event_dates(text, jsonb) to authenticated;

-- Backfill: every event's dates as visitors see them today (the published
-- list when there is one, else the built one). The Eventbrite id uses the
-- same patterns as the app's ebEventIdFromUrl (an ?eid= link, or a path
-- ending /e/<name>-tickets-<id>) on eventbrite hosts.
insert into public.event_dates (
  funnel_id, id, name, starts_at, starts_at_text, time_zone, venue, price,
  ticket_url, eb_event_id, status, opening_reel_id
)
select
  f.funnel_id,
  d ->> 'id',
  d ->> 'name',
  (d ->> 'startsAt')::timestamptz,
  d ->> 'startsAt',
  nullif(d ->> 'timeZone', ''),
  nullif(d ->> 'venue', ''),
  nullif(d ->> 'price', ''),
  d ->> 'ticketUrl',
  case
    when (d ->> 'ticketUrl') !~* '^https?://([a-z0-9-]+\.)*eventbrite\.[a-z]{2,3}(\.[a-z]{2})?(/|\?|$)' then null
    when (d ->> 'ticketUrl') ~ '[?&]eid=\d{6,30}(&|$)' then substring(d ->> 'ticketUrl' from '[?&]eid=(\d{6,30})')
    else substring(split_part(split_part(d ->> 'ticketUrl', '?', 1), '#', 1) from '/e/(?:[^/]*?-)?(\d{6,30})/?$')
  end,
  nullif(d ->> 'status', ''),
  nullif(d ->> 'reelId', '')
from public.event_funnels f
left join public.funnel_publications p on p.slug = f.slug
cross join lateral jsonb_array_elements(coalesce(p.data -> 'events', f.data -> 'events', '[]'::jsonb)) as d
on conflict do nothing;
