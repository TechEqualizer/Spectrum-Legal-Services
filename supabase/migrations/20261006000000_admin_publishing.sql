-- Admin login and live publishing.
--
-- Admins sign in with Supabase Auth (email and password). admin_users says
-- which funnels each one may publish ('*' for all). Everything is enforced
-- here with row-level security, so the site needs no secret key: the
-- admin's own sign-in token is what writes.

-- Who may publish which funnels.
create table public.admin_users (
  email text primary key check (email = lower(email)),
  slugs text[] not null default '{}',
  created_at timestamptz not null default now()
);
comment on table public.admin_users is 'Admins and the funnel slugs each may publish (''*'' = all).';
alter table public.admin_users enable row level security;

-- Admins can read their own row (to see which funnels they may edit).
create policy "Admins read their own row" on public.admin_users
  for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

-- True when the signed-in user may publish this funnel.
create function public.can_publish_funnel(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.email = lower(auth.jwt() ->> 'email')
      and ('*' = any (a.slugs) or p_slug = any (a.slugs))
  );
$$;
revoke all on function public.can_publish_funnel(text) from public, anon;
grant execute on function public.can_publish_funnel(text) to authenticated;

-- What each funnel link shows, as published from the admin. A funnel
-- without a row shows its built-in content.
create table public.funnel_publications (
  slug text primary key check (slug ~ '^[a-z0-9-]{1,64}$'),
  data jsonb not null check (octet_length(data::text) < 500000),
  published_at timestamptz not null default now(),
  published_by text not null
);
comment on table public.funnel_publications is 'Published funnel edits from the admin. Public: it is what the funnel links show.';
alter table public.funnel_publications enable row level security;

-- Anyone can read it: it's exactly what the public funnel link shows.
create policy "Anyone reads publications" on public.funnel_publications
  for select to anon, authenticated
  using (true);

create policy "Admins publish their funnels" on public.funnel_publications
  for insert to authenticated
  with check (public.can_publish_funnel(slug) and published_by = lower(auth.jwt() ->> 'email'));

create policy "Admins republish their funnels" on public.funnel_publications
  for update to authenticated
  using (public.can_publish_funnel(slug))
  with check (public.can_publish_funnel(slug) and published_by = lower(auth.jwt() ->> 'email'));

create policy "Admins unpublish their funnels" on public.funnel_publications
  for delete to authenticated
  using (public.can_publish_funnel(slug));

-- Every publish is kept, so a bad publish can be traced and rolled back.
create table public.funnel_publication_history (
  id bigint generated always as identity primary key,
  slug text not null,
  data jsonb not null,
  published_at timestamptz not null,
  published_by text not null
);
comment on table public.funnel_publication_history is 'Every past publish of each funnel.';
alter table public.funnel_publication_history enable row level security;
create policy "Admins read their funnels' history" on public.funnel_publication_history
  for select to authenticated
  using (public.can_publish_funnel(slug));

create function public.keep_publication_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.funnel_publication_history (slug, data, published_at, published_by)
  values (new.slug, new.data, new.published_at, new.published_by);
  return new;
end;
$$;
revoke all on function public.keep_publication_history() from public, anon, authenticated;

create trigger funnel_publications_history
  after insert or update on public.funnel_publications
  for each row execute function public.keep_publication_history();

-- Uploaded reel videos, photos, covers and captions, in a folder per funnel
-- slug. Public to read (they play on the public link); only that funnel's
-- admins can add files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reel-media', 'reel-media', true, 52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/vtt']
);

create policy "Admins upload to their funnels' folders" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'reel-media'
    and public.can_publish_funnel((storage.foldername(name))[1])
  );
