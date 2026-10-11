-- Pay to go live (docs/plans/03-billing.md, "Pay to go live"): claiming a
-- link no longer starts Core's 14-day trial. The organizer builds for free
-- and their link shows "Coming soon" until they pay (Stripe's webhook then
-- writes their organizer_plans row). Everything else about claiming is as
-- in 20261025000000_signup_claim.sql. Plans already written are untouched.

create or replace function public.claim_signup_invite(
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
  update public.signup_invites set claimed_at = now(), claimed_organizer = p_organizer_slug where id = v_invite;
  return 'claimed';
end;
$$;
