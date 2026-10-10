-- Billing (docs/plans/03-billing.md, step 1): each organizer's plan, one row
-- per organizer. No row means Free. Stripe's webhook (step 2) and Showlnk
-- staff (comps) write it with the secret key; the organizer's admins read
-- their own through organizer_plan(). Every Core gate reads this row,
-- never Stripe.

create table public.organizer_plans (
  organizer_slug text primary key references public.organizers (slug) on delete cascade,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'comped')),
  -- Monthly or yearly, once paid.
  billing_interval text check (billing_interval in ('month', 'year')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  -- Comped until then; null: until changed.
  comped_until timestamptz,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  updated_at timestamptz not null default now()
);

comment on table public.organizer_plans is
  'Each organizer''s plan (no row: Free). Written by the server (Stripe webhook, comps); read by its admins through organizer_plan.';

alter table public.organizer_plans enable row level security;
revoke all on public.organizer_plans from anon, authenticated;

-- The organizer's plan, for its admins (never the Stripe ids).
create function public.organizer_plan(p_organizer text)
returns table (status text, billing_interval text, trial_ends_at timestamptz, current_period_end timestamptz, comped_until timestamptz)
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
    select p.status, p.billing_interval, p.trial_ends_at, p.current_period_end, p.comped_until
    from public.organizer_plans p
    where p.organizer_slug = p_organizer;
end;
$$;

revoke all on function public.organizer_plan(text) from public, anon;
grant execute on function public.organizer_plan(text) to authenticated;

-- Big Love: Core, on Showlnk.
insert into public.organizer_plans (organizer_slug, status)
select 'biglove', 'comped'
where exists (select 1 from public.organizers where slug = 'biglove')
on conflict (organizer_slug) do nothing;
