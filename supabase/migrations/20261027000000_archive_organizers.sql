-- Archiving an organizer (Events → Archive, full admins only): nothing is
-- deleted, and Restore brings it all back. While archived:
--   - the public can't read the organizer or its events, so every link of
--     theirs answers Not found (full admins still read them, to restore);
--   - their admins can't edit anything of theirs (manages_organizer and
--     can_publish_funnel say no), and the app signs them out;
--   - the slug stays taken, so nobody else can claim their links.

alter table public.organizers add column archived_at timestamptz;
comment on column public.organizers.archived_at is 'Set when Showlnk archives the organizer; null while active.';

-- Reading organizers: the public sees active ones; full admins see all.
drop policy "Anyone reads organizers" on public.organizers;
create policy "The public reads active organizers" on public.organizers
  for select to anon using (archived_at is null);
create policy "Admins read active organizers, full admins all" on public.organizers
  for select to authenticated using (archived_at is null or public.manages_all_funnels());

-- Reading events: only those of active organizers, except for full admins.
drop policy "Anyone reads event funnels" on public.event_funnels;
create policy "The public reads events of active organizers" on public.event_funnels
  for select to anon
  using (exists (select 1 from public.organizers o where o.slug = organizer_slug and o.archived_at is null));
create policy "Admins read events of active organizers, full admins all" on public.event_funnels
  for select to authenticated
  using (
    exists (select 1 from public.organizers o where o.slug = organizer_slug and o.archived_at is null)
    or public.manages_all_funnels()
  );

-- An archived organizer's admins manage nothing of theirs.
create or replace function public.manages_organizer(p_organizer text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = lower(auth.jwt() ->> 'email')
      and (
        '*' = any (a.slugs)
        or (
          p_organizer = any (a.organizers)
          and exists (select 1 from public.organizers o where o.slug = p_organizer and o.archived_at is null)
        )
      )
  );
$$;

create or replace function public.can_publish_funnel(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = lower(auth.jwt() ->> 'email')
      and (
        '*' = any (a.slugs)
        or (
          not exists (
            select 1 from public.event_funnels e
            join public.organizers o on o.slug = e.organizer_slug
            where e.slug = p_slug and o.archived_at is not null
          )
          and (
            p_slug = any (a.slugs)
            or exists (
              select 1 from public.event_funnels e
              where e.slug = p_slug and e.organizer_slug = any (a.organizers)
            )
          )
        )
      )
  );
$$;
