-- Presale for followers (docs/plans/02-fans.md, step 4): a date can have a
-- presale link (an Eventbrite access-code link or a hidden ticket page)
-- that only the organizer's followers get, during a window.
--
-- The window lives with the date in the published edits, which anyone can
-- read; the link can't, so it lives here. An event's admins write and read
-- their own links through the two functions below; the server (secret key)
-- reads them for followers during the window. Nobody else can.

create table public.event_presales (
  funnel_id text not null references public.event_funnels (funnel_id) on delete cascade,
  -- The date's id inside the event (FunnelEvent.id).
  date_id text not null check (char_length(date_id) between 1 and 100),
  url text not null check (char_length(url) <= 2048 and url ~ '^https://'),
  updated_at timestamptz not null default now(),
  primary key (funnel_id, date_id)
);

comment on table public.event_presales is
  'Each date''s presale link, for followers only. Written by set_event_presales; read by its admins (event_presales_for) and the server.';

alter table public.event_presales enable row level security;
revoke all on public.event_presales from anon, authenticated;

-- Replaces an event's presale links, for an admin who may publish it.
-- p_presales: [{ "dateId": "...", "url": "https://..." }].
create function public.set_event_presales(p_slug text, p_presales jsonb)
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
  if v_funnel is null then
    return 0;
  end if;
  if jsonb_typeof(p_presales) is distinct from 'array' then
    raise exception 'presales must be a list' using errcode = '22023';
  end if;
  delete from public.event_presales where funnel_id = v_funnel;
  insert into public.event_presales (funnel_id, date_id, url)
  select v_funnel, p ->> 'dateId', p ->> 'url'
  from jsonb_array_elements(p_presales) as p;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- An event's presale links, for its admins (the editor shows them).
create function public.event_presales_for(p_slug text)
returns table (date_id text, url text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_publish_funnel(p_slug) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select p.date_id, p.url
    from public.event_presales p
    join public.event_funnels f on f.funnel_id = p.funnel_id
    where f.slug = p_slug;
end;
$$;

revoke all on function public.set_event_presales(text, jsonb) from public, anon;
revoke all on function public.event_presales_for(text) from public, anon;
grant execute on function public.set_event_presales(text, jsonb) to authenticated;
grant execute on function public.event_presales_for(text) to authenticated;
