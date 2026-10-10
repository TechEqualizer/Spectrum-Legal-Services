-- Claiming a link from the sign-up wizard (docs/plans/05-signup.md, step 3).
-- One step, all or nothing: the organizer, its first event (the night drafted
-- from their flyer, published with the reels' words), the new login's
-- access to that organizer, Core's 14-day trial, and the invite marked
-- claimed. The wizard's server (secret key) calls it, after making the
-- login itself with Supabase Auth.
--
-- Returns 'claimed', or why not: 'invite' (no longer usable), 'slug_taken'
-- (the link name), 'event_taken' (the event's link) or 'email_taken' (that
-- email already runs something on Showlnk).

create function public.claim_signup_invite(
  p_code_hash text,
  p_email text,
  p_organizer_slug text,
  p_organizer_name text,
  p_event_slug text,
  p_funnel_id text,
  p_event jsonb,
  p_publication jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite uuid;
begin
  select id into v_invite from public.signup_invites
   where code_hash = p_code_hash
     and revoked_at is null and claimed_at is null and expires_at > now()
   for update;
  if v_invite is null then
    return 'invite';
  end if;

  -- Links share one space (/f/<slug>): organizers and events alike.
  if exists (select 1 from public.organizers where slug = p_organizer_slug)
     or exists (select 1 from public.event_funnels where slug = p_organizer_slug) then
    return 'slug_taken';
  end if;
  if exists (select 1 from public.organizers where slug = p_event_slug)
     or exists (select 1 from public.event_funnels where slug = p_event_slug or funnel_id = p_funnel_id) then
    return 'event_taken';
  end if;
  if exists (select 1 from public.admin_users where email = lower(p_email)) then
    return 'email_taken';
  end if;

  insert into public.organizers (slug, name) values (p_organizer_slug, btrim(p_organizer_name));
  insert into public.event_funnels (slug, funnel_id, organizer_slug, data)
    values (p_event_slug, p_funnel_id, p_organizer_slug, p_event);
  if p_publication is not null then
    insert into public.funnel_publications (slug, data, published_by)
      values (p_event_slug, p_publication, lower(p_email))
      on conflict (slug) do update set data = excluded.data, published_at = now(), published_by = excluded.published_by;
  end if;
  insert into public.admin_users (email, slugs, organizers) values (lower(p_email), '{}', array[p_organizer_slug]);
  insert into public.organizer_plans (organizer_slug, status, trial_ends_at)
    values (p_organizer_slug, 'trialing', now() + interval '14 days');
  update public.signup_invites set claimed_at = now(), claimed_organizer = p_organizer_slug where id = v_invite;
  return 'claimed';
end;
$$;

revoke all on function public.claim_signup_invite(text, text, text, text, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.claim_signup_invite(text, text, text, text, text, text, jsonb, jsonb) to service_role;
