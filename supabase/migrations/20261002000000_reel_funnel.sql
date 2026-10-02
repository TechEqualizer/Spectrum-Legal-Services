-- Reel funnel events and intake leads for the Spectrum Legal Services site.
--
-- The tables are not readable or writable with the public (publishable) key.
-- The website writes only through the two functions below, which validate
-- their input. Read the data in the Supabase dashboard or with the secret key.

create table public.reel_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  funnel_id text not null check (char_length(funnel_id) <= 100),
  reel_id text not null check (char_length(reel_id) <= 100),
  event text not null check (
    event in ('viewed', 'completed', 'skipped', 'cta_clicked', 'exited')
  )
);

comment on table public.reel_events is
  'What anonymous visitors did with each reel. visitor_id is a random id stored in the visitor''s browser.';

create index reel_events_visitor_idx on public.reel_events (visitor_id, created_at);
create index reel_events_reel_idx on public.reel_events (funnel_id, reel_id, event);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null check (source in ('hero', 'contact')),
  name text not null check (btrim(name) <> '' and char_length(name) <= 200),
  email text not null check (
    char_length(email) <= 320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  phone text check (char_length(phone) <= 50),
  case_type text not null check (char_length(case_type) <= 100),
  message text check (char_length(message) <= 5000),
  visitor_id uuid,
  referring_reel_id text check (char_length(referring_reel_id) <= 100)
);

comment on table public.leads is
  'Consultation requests from the website forms. Contains personal data.';

create index leads_created_idx on public.leads (created_at desc);
create index leads_visitor_idx on public.leads (visitor_id);

alter table public.reel_events enable row level security;
alter table public.leads enable row level security;

-- No policies: the anon and authenticated roles get no direct access.
revoke all on public.reel_events from anon, authenticated;
revoke all on public.leads from anon, authenticated;

create function public.log_reel_event(
  p_visitor_id uuid,
  p_funnel_id text,
  p_reel_id text,
  p_event text
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.reel_events (visitor_id, funnel_id, reel_id, event)
  values (p_visitor_id, p_funnel_id, p_reel_id, p_event);
$$;

create function public.submit_lead(
  p_source text,
  p_name text,
  p_email text,
  p_phone text,
  p_case_type text,
  p_message text,
  p_visitor_id uuid,
  p_referring_reel_id text
) returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.leads (
    source, name, email, phone, case_type, message, visitor_id, referring_reel_id
  )
  values (
    p_source,
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(p_phone), ''),
    p_case_type,
    nullif(btrim(p_message), ''),
    p_visitor_id,
    p_referring_reel_id
  )
  returning id;
$$;

revoke all on function public.log_reel_event(uuid, text, text, text) from public;
revoke all on function public.submit_lead(text, text, text, text, text, text, uuid, text) from public;
grant execute on function public.log_reel_event(uuid, text, text, text) to anon;
grant execute on function public.submit_lead(text, text, text, text, text, text, uuid, text) to anon;
-- Supabase grants new functions to authenticated by default; the site only uses anon.
revoke execute on function public.log_reel_event(uuid, text, text, text) from authenticated;
revoke execute on function public.submit_lead(text, text, text, text, text, text, uuid, text) from authenticated;
