-- Standalone funnel links (/f/<slug>): where each link was shared, the new
-- calls to action on every reel, and "text me later" requests.
--
-- The site now writes through log_reel_event_v2 and submit_lead_v2. The
-- original functions stay, so a deploy still on the previous version keeps
-- working; drop them once every deploy uses v2:
--   drop function public.log_reel_event(uuid, text, text, text);
--   drop function public.submit_lead(text, text, text, text, text, text, uuid, text);

-- Where the link was shared, from its ?src= tag.
alter table public.reel_events
  add column source_tag text check (source_tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$');

alter table public.reel_events drop constraint reel_events_event_check;
alter table public.reel_events add constraint reel_events_event_check check (
  event in (
    'viewed', 'completed', 'skipped', 'exited',
    'cta_clicked', 'call_clicked', 'text_later_clicked', 'shared'
  )
);

comment on column public.reel_events.source_tag is
  'Where the funnel link was shared (instagram, sms, referral...). Null for direct visits.';

-- Leads from the funnel give a mobile number; email becomes optional there.
alter table public.leads alter column email drop not null;
alter table public.leads drop constraint leads_source_check;
alter table public.leads add constraint leads_source_check
  check (source in ('hero', 'contact', 'funnel'));

alter table public.leads
  add column intent text not null default 'book' check (intent in ('book', 'text_later')),
  add column source_tag text check (source_tag ~ '^[a-z0-9][a-z0-9_-]{0,39}$'),
  add column sms_consent_at timestamptz,
  add column sms_consent_text text check (char_length(sms_consent_text) <= 1000);

alter table public.leads
  add constraint leads_reachable_check check (email is not null or phone is not null),
  add constraint leads_funnel_phone_check check (source <> 'funnel' or phone is not null),
  add constraint leads_text_later_consent_check check (
    intent <> 'text_later'
    or (phone is not null and sms_consent_at is not null and sms_consent_text is not null)
  );

comment on column public.leads.intent is
  'book: wants a call back about their case. text_later: wants the next video by text.';
comment on column public.leads.sms_consent_text is
  'The consent wording the person agreed to, saved with the time they agreed.';

create index leads_text_later_idx on public.leads (created_at) where intent = 'text_later';

-- Functions: same as before, plus the new fields.
create function public.log_reel_event_v2(
  p_visitor_id uuid,
  p_funnel_id text,
  p_reel_id text,
  p_event text,
  p_source_tag text
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.reel_events (visitor_id, funnel_id, reel_id, event, source_tag)
  values (p_visitor_id, p_funnel_id, p_reel_id, p_event, p_source_tag);
$$;

create function public.submit_lead_v2(
  p_source text,
  p_name text,
  p_email text,
  p_phone text,
  p_case_type text,
  p_message text,
  p_visitor_id uuid,
  p_referring_reel_id text,
  p_intent text,
  p_source_tag text,
  p_sms_consent_text text
) returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.leads (
    source, name, email, phone, case_type, message, visitor_id,
    referring_reel_id, intent, source_tag, sms_consent_at, sms_consent_text
  )
  values (
    p_source,
    btrim(p_name),
    nullif(lower(btrim(p_email)), ''),
    nullif(btrim(p_phone), ''),
    p_case_type,
    nullif(btrim(p_message), ''),
    p_visitor_id,
    p_referring_reel_id,
    coalesce(p_intent, 'book'),
    p_source_tag,
    case when p_sms_consent_text is not null then now() end,
    p_sms_consent_text
  )
  returning id;
$$;

revoke all on function public.log_reel_event_v2(uuid, text, text, text, text) from public;
revoke all on function public.submit_lead_v2(text, text, text, text, text, text, uuid, text, text, text, text) from public;
grant execute on function public.log_reel_event_v2(uuid, text, text, text, text) to anon;
grant execute on function public.submit_lead_v2(text, text, text, text, text, text, uuid, text, text, text, text) to anon;
-- Supabase grants new functions to authenticated by default; the site only uses anon.
revoke execute on function public.log_reel_event_v2(uuid, text, text, text, text) from authenticated;
revoke execute on function public.submit_lead_v2(text, text, text, text, text, text, uuid, text, text, text, text) from authenticated;
