-- The Showlnk waitlist: organizers who asked for early access on the home
-- page. The site writes only through join_waitlist (with the publishable
-- key); full admins read the list in Settings → Waitlist. Joining twice
-- with the same email keeps one row and updates the Instagram handle.

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 254),
  instagram text check (instagram is null or instagram ~ '^[a-z0-9._]{1,30}$'),
  source_tag text check (source_tag is null or char_length(source_tag) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.waitlist is 'Early-access sign-ups from the Showlnk home page.';
alter table public.waitlist enable row level security;

create policy "Full admins read the waitlist" on public.waitlist
  for select to authenticated
  using (public.manages_all_funnels());

create function public.join_waitlist(p_email text, p_instagram text, p_source_tag text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.waitlist (email, instagram, source_tag)
  values (lower(btrim(p_email)), nullif(lower(btrim(p_instagram)), ''), p_source_tag)
  on conflict (email) do update
    set instagram = coalesce(excluded.instagram, public.waitlist.instagram),
        updated_at = now();
$$;

revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon;
-- Supabase grants new functions to authenticated by default; the site only uses anon.
revoke execute on function public.join_waitlist(text, text, text) from authenticated;
