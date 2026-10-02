-- Several businesses can have a funnel link (/f/<slug>), so each lead now
-- records which funnel it came from. The site writes through submit_lead_v3;
-- submit_lead_v2 stays for deploys made before this one and can be dropped
-- once every deploy uses v3.

alter table public.leads
  add column funnel_id text check (char_length(funnel_id) <= 100);

comment on column public.leads.funnel_id is
  'The funnel link the lead came from (source = funnel). Null for the website forms.';

create index leads_funnel_idx on public.leads (funnel_id, created_at desc);

create function public.submit_lead_v3(
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
  p_sms_consent_text text,
  p_funnel_id text
) returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.leads (
    source, name, email, phone, case_type, message, visitor_id,
    referring_reel_id, intent, source_tag, sms_consent_at, sms_consent_text,
    funnel_id
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
    p_sms_consent_text,
    p_funnel_id
  )
  returning id;
$$;

revoke all on function public.submit_lead_v3(text, text, text, text, text, text, uuid, text, text, text, text, text) from public;
grant execute on function public.submit_lead_v3(text, text, text, text, text, text, uuid, text, text, text, text, text) to anon;
-- Supabase grants new functions to authenticated by default; the site only uses anon.
revoke execute on function public.submit_lead_v3(text, text, text, text, text, text, uuid, text, text, text, text, text) from authenticated;
