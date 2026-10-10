-- Fans (docs/plans/02-fans.md, step 1): a visitor follows an organizer
-- with their email, confirmed through a single-use link.
--
-- Additive: nothing on the event links uses it yet (step 2 adds Follow).
-- Like the Eventbrite tables, everything here is server-only: RLS on, no
-- policies, no grants. The app reaches it through the fan_* functions below
-- with the secret key; visitors and admins can't read or write it directly.

-- One row per confirmed email.
create table public.fans (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (char_length(email) between 3 and 320 and email = lower(email)),
  created_at timestamptz not null default now()
);

-- A fan following an organizer: where they followed from and the words
-- they agreed to, kept with the follow. Unfollowing keeps the row (so the
-- organizer's counts stay honest) with unfollowed_at set.
create table public.follows (
  fan_id uuid not null references public.fans (id) on delete cascade,
  organizer_slug text not null references public.organizers (slug) on update cascade on delete cascade,
  source_tag text check (source_tag is null or source_tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  -- The event link they followed from, if any.
  funnel_id text check (funnel_id is null or funnel_id ~ '^[a-z0-9-]{1,80}$'),
  consent_text text not null check (char_length(consent_text) between 1 and 600),
  confirmed_at timestamptz not null default now(),
  unfollowed_at timestamptz,
  primary key (fan_id, organizer_slug)
);
create index follows_organizer_idx on public.follows (organizer_slug) where unfollowed_at is null;

-- Sign-in links: single-use, 20 minutes. Only the SHA-256 of the token is
-- stored, so a copy of this table can't sign anyone in. The follow it
-- will create rides along until it's confirmed.
create table public.fan_login_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  email text not null check (char_length(email) between 3 and 320 and email = lower(email)),
  organizer_slug text not null references public.organizers (slug) on update cascade on delete cascade,
  source_tag text check (source_tag is null or source_tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  funnel_id text check (funnel_id is null or funnel_id ~ '^[a-z0-9-]{1,80}$'),
  consent_text text not null check (char_length(consent_text) between 1 and 600),
  -- A keyed hash of the sender's IP, for rate limits; never the IP itself.
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '20 minutes',
  used_at timestamptz
);
create index fan_login_tokens_email_idx on public.fan_login_tokens (email, created_at);
create index fan_login_tokens_ip_idx on public.fan_login_tokens (ip_hash, created_at) where ip_hash is not null;

alter table public.fans enable row level security;
alter table public.follows enable row level security;
alter table public.fan_login_tokens enable row level security;
revoke all on public.fans, public.follows, public.fan_login_tokens from anon, authenticated;

-- Media for fans-only reels (step 3): private. Files are served through
-- short-lived signed addresses after the server checks the follow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'reel-media-fans', 'reel-media-fans', false, 52428800,
  array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/vtt']
);

-- Starts a follow: stores a sign-in token for the email, within the rate
-- limits (3 links an hour per email, 10 per IP). Returns 'ok',
-- 'rate_limited' or 'unknown_organizer'.
create function public.fan_start(
  p_token_hash text, p_email text, p_organizer text, p_consent_text text,
  p_source_tag text default null, p_funnel_id text default null, p_ip_hash text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(p_email));
begin
  if not exists (select 1 from public.organizers where slug = p_organizer) then
    return 'unknown_organizer';
  end if;
  if (select count(*) from public.fan_login_tokens
      where email = v_email and created_at > now() - interval '1 hour') >= 3
     or (p_ip_hash is not null and (select count(*) from public.fan_login_tokens
      where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10) then
    return 'rate_limited';
  end if;
  -- Old links are kept a day for the limits above, then cleared.
  delete from public.fan_login_tokens where created_at < now() - interval '1 day';
  insert into public.fan_login_tokens (token_hash, email, organizer_slug, source_tag, funnel_id, consent_text, ip_hash)
  values (p_token_hash, v_email, p_organizer, nullif(p_source_tag, ''), nullif(p_funnel_id, ''), p_consent_text, p_ip_hash);
  return 'ok';
end;
$$;

-- What a sign-in link is for, without using it: the confirm page shows it.
-- status: 'valid', 'used' or 'expired'; no row when the token is unknown.
create function public.fan_token_info(p_token_hash text)
returns table (organizer_slug text, email text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.organizer_slug, t.email,
    case when t.used_at is not null then 'used' when t.expires_at <= now() then 'expired' else 'valid' end
  from public.fan_login_tokens t
  where t.token_hash = p_token_hash;
$$;

-- Uses a sign-in link: marks it used (once), makes the fan, and makes or
-- renews the follow. Returns the fan and organizer; no row if the link is
-- unknown, used or expired.
create function public.fan_confirm(p_token_hash text)
returns table (fan_id uuid, organizer_slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.fan_login_tokens;
  v_fan uuid;
begin
  update public.fan_login_tokens
     set used_at = now()
   where token_hash = p_token_hash and used_at is null and expires_at > now()
  returning * into t;
  if t.token_hash is null then
    return;
  end if;
  insert into public.fans (email) values (t.email)
  on conflict (email) do update set email = excluded.email
  returning id into v_fan;
  insert into public.follows (fan_id, organizer_slug, source_tag, funnel_id, consent_text)
  values (v_fan, t.organizer_slug, t.source_tag, t.funnel_id, t.consent_text)
  on conflict on constraint follows_pkey do update
    set unfollowed_at = null, confirmed_at = now(), consent_text = excluded.consent_text,
        source_tag = excluded.source_tag, funnel_id = excluded.funnel_id
    where public.follows.unfollowed_at is not null;
  fan_id := v_fan;
  organizer_slug := t.organizer_slug;
  return next;
end;
$$;

-- The organizers a fan follows now.
create function public.fan_following(p_fan_id uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select f.organizer_slug from public.follows f where f.fan_id = p_fan_id and f.unfollowed_at is null order by 1;
$$;

-- Unfollows an organizer. Returns whether there was a follow to end.
create function public.fan_unfollow(p_fan_id uuid, p_organizer text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.follows set unfollowed_at = now()
   where fan_id = p_fan_id and organizer_slug = p_organizer and unfollowed_at is null;
  return found;
end;
$$;

-- Deletes a fan and everything about them: follows and pending links.
create function public.fan_forget(p_fan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  delete from public.fans where id = p_fan_id returning email into v_email;
  if v_email is null then
    return false;
  end if;
  delete from public.fan_login_tokens where email = v_email;
  return true;
end;
$$;

-- The server alone (the secret key) calls these.
revoke all on function public.fan_start(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.fan_token_info(text) from public, anon, authenticated;
revoke all on function public.fan_confirm(text) from public, anon, authenticated;
revoke all on function public.fan_following(uuid) from public, anon, authenticated;
revoke all on function public.fan_unfollow(uuid, text) from public, anon, authenticated;
revoke all on function public.fan_forget(uuid) from public, anon, authenticated;
grant execute on function public.fan_start(text, text, text, text, text, text, text) to service_role;
grant execute on function public.fan_token_info(text) to service_role;
grant execute on function public.fan_confirm(text) to service_role;
grant execute on function public.fan_following(uuid) to service_role;
grant execute on function public.fan_unfollow(uuid, text) to service_role;
grant execute on function public.fan_forget(uuid) to service_role;
