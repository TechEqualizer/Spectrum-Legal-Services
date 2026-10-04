-- Organizers and their events, stored as data instead of code.
--
-- An organizer (Big Love Productions) has events (Masquerade on the
-- Runway); each event is one funnel link, /f/<slug>, whose content is a
-- funnel definition (src/data/funnel-types.ts) checked by the app on the
-- way in and out. Edits published from the admin still go to
-- funnel_publications on top of it.
--
-- Built-in samples (jlf, medspa, events) stay in code; the app looks there
-- first, so a row here can't take over their links.

-- Who runs events.
create table public.organizers (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,64}$'),
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);
comment on table public.organizers is 'Event organizers (businesses) using Event Reels.';
alter table public.organizers enable row level security;

-- Each event: one funnel link and its built-in content.
create table public.event_funnels (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,64}$'),
  -- The funnel's id, stored with every lead and reel event; never changes.
  funnel_id text not null unique check (funnel_id ~ '^[a-z0-9-]{1,80}$'),
  organizer_slug text not null references public.organizers (slug) on update cascade,
  data jsonb not null check (octet_length(data::text) < 500000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.event_funnels is 'Each event''s funnel link (/f/<slug>) and its content. Public: it is what the link shows.';
create index event_funnels_organizer on public.event_funnels (organizer_slug);
alter table public.event_funnels enable row level security;

-- True for admins who manage every funnel ('*').
create function public.manages_all_funnels()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = lower(auth.jwt() ->> 'email') and '*' = any (a.slugs)
  );
$$;
revoke all on function public.manages_all_funnels() from public, anon;
grant execute on function public.manages_all_funnels() to authenticated;

-- Anyone can read both: they're what the public links show.
create policy "Anyone reads organizers" on public.organizers
  for select to anon, authenticated using (true);
create policy "Anyone reads event funnels" on public.event_funnels
  for select to anon, authenticated using (true);

-- Organizers are added by admins who manage every funnel.
create policy "Full admins add organizers" on public.organizers
  for insert to authenticated with check (public.manages_all_funnels());
create policy "Full admins rename organizers" on public.organizers
  for update to authenticated using (public.manages_all_funnels()) with check (public.manages_all_funnels());

-- An event's admins edit it; new events need a full admin.
create policy "Full admins add events" on public.event_funnels
  for insert to authenticated with check (public.manages_all_funnels());
create policy "Admins edit their events" on public.event_funnels
  for update to authenticated
  using (public.can_publish_funnel(slug))
  with check (public.can_publish_funnel(slug));
create policy "Full admins remove events" on public.event_funnels
  for delete to authenticated using (public.manages_all_funnels());

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create trigger event_funnels_touch
  before update on public.event_funnels
  for each row execute function public.touch_updated_at();
