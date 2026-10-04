-- Cleanup: the first versions of the tracking and sign-up functions. The
-- site calls only log_reel_event_v2 and submit_lead_v3 (src/lib/server/
-- supabase.ts); these older ones were still callable by anyone.

drop function if exists public.log_reel_event(uuid, text, text, text);
drop function if exists public.submit_lead(text, text, text, text, text, text, uuid, text);
drop function if exists public.submit_lead_v2(text, text, text, text, text, text, uuid, text, text, text, text);
