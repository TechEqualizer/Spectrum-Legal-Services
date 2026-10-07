-- Eventbrite: tickets SOLD per place a link was shared, next to ticket clicks.
--
-- Every Tickets button sends buyers to Eventbrite with the tracking code
-- aff=reels_<source> (src/lib/events.ts). An organizer connects their
-- Eventbrite account once (OAuth: we never see their password); Eventbrite
-- then tells us about each order (a webhook), the server fetches the order
-- with the organizer's token, and records it here, matched to the event's
-- funnel by its ticket link and to a source by the attendees' affiliate code.
--
-- Both tables are closed to everyone (RLS on, no policies, no grants): only
-- the server writes and reads them, with the project's secret key. Admins
-- see sales only as totals, through funnel_stats below, for events they may
-- publish.

-- One Eventbrite account per organizer.
create table public.eventbrite_connections (
  organizer_slug text primary key references public.organizers (slug) on update cascade on delete cascade,
  eb_user_id text not null check (char_length(eb_user_id) between 1 and 64),
  eb_org_id text not null check (char_length(eb_org_id) between 1 and 64),
  eb_org_name text check (eb_org_name is null or char_length(eb_org_name) <= 200),
  -- The organizer's Eventbrite token, AES-256-GCM encrypted by the app
  -- (EVENTBRITE_TOKEN_KEY): base64url of iv (12 bytes) + tag (16) + ciphertext.
  token_ciphertext text not null check (char_length(token_ciphertext) between 40 and 2000),
  -- Eventbrite's webhook for this account; deliveries are matched by it.
  webhook_id text unique check (webhook_id is null or char_length(webhook_id) between 1 and 64),
  connected_by text not null check (char_length(connected_by) between 3 and 254),
  connected_at timestamptz not null default now(),
  last_order_at timestamptz
);
comment on table public.eventbrite_connections is 'Organizers'' Eventbrite accounts (encrypted token, webhook). Server only (secret key).';
alter table public.eventbrite_connections enable row level security;
revoke all on table public.eventbrite_connections from anon, authenticated;

-- Each Eventbrite order for an organizer's event, kept after a disconnect
-- (sales history). Refunds and cancellations update the row.
create table public.ticket_sales (
  eventbrite_order_id text primary key check (eventbrite_order_id ~ '^[0-9]{1,30}$'),
  organizer_slug text not null references public.organizers (slug) on update cascade on delete cascade,
  funnel_id text not null check (funnel_id ~ '^[a-z0-9-]{1,80}$'),
  -- The FunnelEvent (date) whose ticket link sold it, when known.
  event_id text check (event_id is null or char_length(event_id) <= 80),
  eb_event_id text not null check (eb_event_id ~ '^[0-9]{1,30}$'),
  ordered_at timestamptz not null,
  -- Tickets still valid on the order (refunded or cancelled attendees aside).
  quantity int not null default 0 check (quantity between 0 and 10000),
  gross_cents int check (gross_cents is null or gross_cents >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  -- The attendees' Eventbrite affiliate (tracking) code, as Eventbrite gave it.
  aff text check (aff is null or char_length(aff) <= 100),
  -- The <source> from our reels_<source> code; null for orders not from our links.
  source_tag text check (source_tag is null or source_tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  status text not null check (status in ('placed', 'refunded', 'cancelled')),
  updated_at timestamptz not null default now()
);
comment on table public.ticket_sales is 'Eventbrite orders for organizers'' events, by funnel and source. Server only (secret key).';
create index ticket_sales_funnel_ordered on public.ticket_sales (funnel_id, ordered_at);
create index ticket_sales_organizer on public.ticket_sales (organizer_slug);
alter table public.ticket_sales enable row level security;
revoke all on table public.ticket_sales from anon, authenticated;

-- funnel_stats, as before, plus tickets sold (same signature and checks).
-- New keys:
--   sold        {current, previous}: tickets sold (placed orders' quantity)
--               this period and the one before
--   sales       [{tag, n}]: tickets sold this period by source_tag
--               (null: Eventbrite orders that didn't come from our links)
--   eventbrite  true when the event's organizer has Eventbrite connected
create or replace function public.funnel_stats(p_slug text, p_days int, p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_funnel text;
  v_organizer text;
  v_since timestamptz := now() - make_interval(days => p_days);
  v_before timestamptz := now() - make_interval(days => 2 * p_days);
begin
  if p_days not in (7, 30, 90) then
    raise exception 'days must be 7, 30 or 90' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then
    raise exception 'unknown time zone' using errcode = '22023';
  end if;
  if not public.can_publish_funnel(p_slug) then
    raise exception 'not your event' using errcode = '42501';
  end if;
  select e.funnel_id, e.organizer_slug into v_funnel, v_organizer from public.event_funnels e where e.slug = p_slug;
  if v_funnel is null then
    return null;
  end if;

  return jsonb_build_object(
    -- Each event's count this period and the one before, for the tiles.
    'current', (
      select coalesce(jsonb_object_agg(event, n), '{}'::jsonb) from (
        select r.event, count(*) as n from public.reel_events r
        where r.funnel_id = v_funnel and r.created_at >= v_since
        group by r.event
      ) t
    ),
    'previous', (
      select coalesce(jsonb_object_agg(event, n), '{}'::jsonb) from (
        select r.event, count(*) as n from public.reel_events r
        where r.funnel_id = v_funnel and r.created_at >= v_before and r.created_at < v_since
        group by r.event
      ) t
    ),
    -- Views per day, in the admin's own time zone.
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'views', n) order by d), '[]'::jsonb) from (
        select (r.created_at at time zone p_tz)::date as d, count(*) as n from public.reel_events r
        where r.funnel_id = v_funnel and r.event = 'viewed' and r.created_at >= v_since
        group by 1
      ) t
    ),
    -- Each reel's counts by event.
    'reels', (
      select coalesce(jsonb_agg(jsonb_build_object('reel', reel_id, 'event', event, 'n', n)), '[]'::jsonb) from (
        select r.reel_id, r.event, count(*) as n from public.reel_events r
        where r.funnel_id = v_funnel and r.created_at >= v_since
        group by r.reel_id, r.event
      ) t
    ),
    -- Per place the link was shared: people, ticket clicks, calls.
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('tag', source_tag, 'visitors', visitors, 'tickets', tickets, 'calls', calls)), '[]'::jsonb) from (
        select r.source_tag,
               count(distinct r.visitor_id) as visitors,
               count(*) filter (where r.event = 'cta_clicked') as tickets,
               count(*) filter (where r.event = 'call_clicked') as calls
        from public.reel_events r
        where r.funnel_id = v_funnel and r.created_at >= v_since
        group by r.source_tag
      ) t
    ),
    -- Updates sign-ups per place shared (counts only; who signed up stays in leads).
    'updates', (
      select coalesce(jsonb_agg(jsonb_build_object('tag', source_tag, 'n', n)), '[]'::jsonb) from (
        select l.source_tag, count(*) as n from public.leads l
        where l.funnel_id = v_funnel and l.intent = 'text_later' and l.created_at >= v_since
        group by l.source_tag
      ) t
    ),
    -- Tickets sold on Eventbrite (placed orders), this period and the one before.
    'sold', jsonb_build_object(
      'current', (
        select coalesce(sum(s.quantity), 0) from public.ticket_sales s
        where s.funnel_id = v_funnel and s.status = 'placed' and s.ordered_at >= v_since
      ),
      'previous', (
        select coalesce(sum(s.quantity), 0) from public.ticket_sales s
        where s.funnel_id = v_funnel and s.status = 'placed' and s.ordered_at >= v_before and s.ordered_at < v_since
      )
    ),
    -- Tickets sold this period per place shared (null: not from our links).
    'sales', (
      select coalesce(jsonb_agg(jsonb_build_object('tag', source_tag, 'n', n)), '[]'::jsonb) from (
        select s.source_tag, sum(s.quantity) as n from public.ticket_sales s
        where s.funnel_id = v_funnel and s.status = 'placed' and s.ordered_at >= v_since
        group by s.source_tag
        having sum(s.quantity) > 0
      ) t
    ),
    -- Whether the organizer has Eventbrite connected (never the account itself).
    'eventbrite', exists (select 1 from public.eventbrite_connections c where c.organizer_slug = v_organizer)
  );
end;
$$;
revoke all on function public.funnel_stats(text, int, text) from public, anon;
grant execute on function public.funnel_stats(text, int, text) to authenticated;
