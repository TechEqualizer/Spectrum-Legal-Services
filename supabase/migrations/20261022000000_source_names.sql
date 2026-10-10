-- What an organizer calls each place they share their links: the name they
-- typed in the Share page's link builder ("DJ Mike's story"), kept as typed,
-- for the tag the link carries (?src=dj-mikes-story). Results, Share, Home,
-- Leads and Fans show this name; tags without one read as words.
--
-- Only the organizer's own admins read or write them, through the two
-- functions below.

create table public.source_names (
  organizer_slug text not null references public.organizers (slug) on delete cascade,
  tag text not null check (tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  updated_at timestamptz not null default now(),
  primary key (organizer_slug, tag)
);

comment on table public.source_names is
  'An organizer''s own name for each link tag, as typed in the link builder. Written by set_source_name; read by source_names_for.';

alter table public.source_names enable row level security;
revoke all on public.source_names from anon, authenticated;

-- Names a tag for the organizer (or, with an empty name, forgets it).
create function public.set_source_name(p_organizer text, p_tag text, p_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_name is null or btrim(p_name) = '' then
    delete from public.source_names where organizer_slug = p_organizer and tag = p_tag;
    return found;
  end if;
  insert into public.source_names (organizer_slug, tag, name)
  values (p_organizer, p_tag, btrim(p_name))
  on conflict (organizer_slug, tag) do update set name = excluded.name, updated_at = now();
  return true;
end;
$$;

-- The organizer's names, for its admins.
create function public.source_names_for(p_organizer text)
returns table (tag text, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select s.tag, s.name from public.source_names s where s.organizer_slug = p_organizer order by s.tag;
end;
$$;

revoke all on function public.set_source_name(text, text, text) from public, anon;
revoke all on function public.source_names_for(text) from public, anon;
grant execute on function public.set_source_name(text, text, text) to authenticated;
grant execute on function public.source_names_for(text) to authenticated;
