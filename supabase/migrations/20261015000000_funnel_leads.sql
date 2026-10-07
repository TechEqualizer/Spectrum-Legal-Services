-- An event's leads for its admins (the admin's Leads page).
--
-- leads and reel_events stay closed to everyone (no read policies). Like
-- funnel_stats, this one function returns one event's leads, and only to
-- admins who may publish that event. It looks the event's funnel id up
-- itself, so a caller can't ask for another business's leads. The visitor
-- id stays inside: each lead comes with the reels that visitor watched to
-- the end before asking, in the order they first finished them.

create function public.funnel_leads(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_funnel text;
begin
  if not public.can_publish_funnel(p_slug) then
    raise exception 'not your event' using errcode = '42501';
  end if;
  select e.funnel_id into v_funnel from public.event_funnels e where e.slug = p_slug;
  if v_funnel is null then
    return null;
  end if;

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', l.id,
      'created_at', l.created_at,
      'name', l.name,
      'phone', l.phone,
      'email', l.email,
      'intent', l.intent,
      'case_type', l.case_type,
      'message', l.message,
      'referring_reel_id', l.referring_reel_id,
      'source_tag', l.source_tag,
      'watched', (
        select coalesce(jsonb_agg(w.reel_id order by w.first_at), '[]'::jsonb) from (
          select r.reel_id, min(r.created_at) as first_at from public.reel_events r
          where l.visitor_id is not null
            and r.visitor_id = l.visitor_id
            and r.funnel_id = v_funnel
            and r.event = 'completed'
            and r.created_at <= l.created_at
          group by r.reel_id
        ) w
      )
    ) order by l.created_at desc), '[]'::jsonb)
    from (
      select * from public.leads x
      where x.funnel_id = v_funnel
      order by x.created_at desc
      limit 500
    ) l
  );
end;
$$;
revoke all on function public.funnel_leads(text) from public, anon;
grant execute on function public.funnel_leads(text) to authenticated;
