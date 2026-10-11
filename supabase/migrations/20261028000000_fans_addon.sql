-- The fans add-on (docs/plans/03-billing.md, "Pay to go live", step 3):
-- Follow, presales for followers, fans-only reels and the fan calendar are
-- an add-on to Core ($15/month or $150/year), a second item on the same
-- Stripe subscription. Stripe's webhook writes whether it's on; comped
-- organizers have it without it being set.

alter table public.organizer_plans add column fans boolean not null default false;
comment on column public.organizer_plans.fans is 'Whether the fans add-on is on the organizer''s subscription (written by the Stripe webhook).';

-- The organizer's plan for its admins, now with the add-on. The return type
-- changes, so the function is made again (same name, same rights).
drop function public.organizer_plan(text);
create function public.organizer_plan(p_organizer text)
returns table (status text, billing_interval text, trial_ends_at timestamptz, current_period_end timestamptz, comped_until timestamptz, fans boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.manages_organizer(p_organizer) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select p.status, p.billing_interval, p.trial_ends_at, p.current_period_end, p.comped_until, p.fans
    from public.organizer_plans p
    where p.organizer_slug = p_organizer;
end;
$$;

revoke all on function public.organizer_plan(text) from public, anon;
grant execute on function public.organizer_plan(text) to authenticated;
