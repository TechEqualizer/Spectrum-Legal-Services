-- Real results for an event's admins.
--
-- reel_events and leads stay closed to everyone (no read policies): this
-- one function returns an event's totals, never a row, and only to admins
-- who may publish that event. It looks the event's funnel id up itself, so
-- a caller can't ask for another business's numbers.

create function public.funnel_stats(p_slug text, p_days int, p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_funnel text;
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
  select e.funnel_id into v_funnel from public.event_funnels e where e.slug = p_slug;
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
    )
  );
end;
$$;
revoke all on function public.funnel_stats(text, int, text) from public, anon;
grant execute on function public.funnel_stats(text, int, text) to authenticated;
