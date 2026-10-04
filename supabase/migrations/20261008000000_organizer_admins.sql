-- Organizers run their own events.
--
-- An admin listed for an organizer (admin_users.organizers) edits and
-- publishes every one of that organizer's events, including ones added
-- later, and adds new events for them. admin_users.slugs still grants
-- single funnels ('*' for all).

alter table public.admin_users
  add column organizers text[] not null default '{}';
comment on column public.admin_users.organizers is 'Organizers whose events this admin runs: all of them, and new ones.';

-- True for admins who run this organizer's events (or manage every funnel).
create function public.manages_organizer(p_organizer text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = lower(auth.jwt() ->> 'email')
      and ('*' = any (a.slugs) or p_organizer = any (a.organizers))
  );
$$;
revoke all on function public.manages_organizer(text) from public, anon;
grant execute on function public.manages_organizer(text) to authenticated;

-- A funnel's admins now include its organizer's admins. This one function
-- guards publications, their history, media uploads and event edits.
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
        or p_slug = any (a.slugs)
        or exists (
          select 1 from public.event_funnels e
          where e.slug = p_slug and e.organizer_slug = any (a.organizers)
        )
      )
  );
$$;

-- New events: by their organizer's admins, not only full admins.
drop policy "Full admins add events" on public.event_funnels;
create policy "Organizer admins add events" on public.event_funnels
  for insert to authenticated with check (public.manages_organizer(organizer_slug));

-- An event's link, id and organizer are fixed once made; only full admins
-- change them (moving an event to another organizer would hand it over).
create function public.keep_event_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.slug, new.funnel_id, new.organizer_slug) is distinct from (old.slug, old.funnel_id, old.organizer_slug)
     and not public.manages_all_funnels() then
    raise exception 'Only Event Reels can change an event''s link or organizer.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_event_identity() from public, anon, authenticated;

create trigger event_funnels_keep_identity
  before update on public.event_funnels
  for each row execute function public.keep_event_identity();
